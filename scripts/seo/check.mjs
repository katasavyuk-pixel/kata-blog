#!/usr/bin/env node
/**
 * SEO check over rendered HTML (no dependencies). Brief of 17-oct-2026, phase 3.
 *
 * Source of truth: NBI-WEB/scripts/seo/check.mjs. The blog (blog-newsletter)
 * carries an identical copy; the tech-auditor agent compares the two hashes.
 * It complements scripts/seo-check.ts (which reads the build and knows the page
 * registry) with what can only be seen over HTTP and across the two domains.
 *
 *   node scripts/seo/check.mjs --origin https://kata.ianexora.com
 *   node scripts/seo/check.mjs --local http://localhost:3000 --site https://kata.ianexora.com
 *   node scripts/seo/check.mjs --origin https://kata.ianexora.com --compare https://ianexora.com
 *
 * Reads the sitemap, fetches every URL and checks what the brief of 17-oct-2026 asks for:
 *   - lastmod that is the build instant (same timestamp with time on several URLs, within 48 h)
 *   - og:title / twitter:title equal to the author's name, missing og:image, og:url != canonical
 *   - JSON-LD that does not parse or lacks @context/@type; indexable page without JSON-LD
 *   - Article/BlogPosting without image or with a UTC-midnight date
 *   - noindex URLs announced in the sitemap, internal links to routes that redirect
 *   - with --compare: the shared Person node (same @id, same sameAs) on both domains
 *
 * Writes a JSON report (--json <file>) and a readable one to stdout. Exit code 1 if any
 * blocking issue is found, 2 if the run itself failed.
 *
 * Remote origins are fetched one at a time with a pause (--delay, default 1500 ms): a burst
 * triggers Vercel's JS challenge for minutes.
 */

const args = parseArgs(process.argv.slice(2))
const PERSON_ID = args['person-id'] ?? 'https://ianexora.com/sobre-katalin-savyuk#person'
const AUTHOR_NAMES = (args['author-names'] ?? 'Kata Ivanovych,Katalin Savyuk').split(',').map((s) => s.trim())

function parseArgs(argv) {
  const out = {}
  for (let i = 0; i < argv.length; i++) {
    const a = argv[i]
    if (!a.startsWith('--')) continue
    const k = a.slice(2)
    const v = argv[i + 1] && !argv[i + 1].startsWith('--') ? argv[++i] : true
    out[k] = v
  }
  return out
}

const sleep = (ms) => new Promise((r) => setTimeout(r, ms))

const ENTITIES = { amp: '&', quot: '"', apos: "'", lt: '<', gt: '>', nbsp: '\u00a0' }
function decode(s) {
  return s
    .replace(/&#x([0-9a-f]+);/gi, (_, h) => String.fromCodePoint(parseInt(h, 16)))
    .replace(/&#(\d+);/g, (_, d) => String.fromCodePoint(Number(d)))
    .replace(/&([a-z]+);/gi, (m, n) => ENTITIES[n.toLowerCase()] ?? m)
}

function attrs(tag) {
  const out = {}
  for (const m of tag.matchAll(/([\w:-]+)\s*=\s*("([^"]*)"|'([^']*)')/g)) out[m[1].toLowerCase()] = decode(m[3] ?? m[4] ?? '')
  return out
}

/** One origin: fetches with a pause between requests if it is remote. */
function client(origin, { delay }) {
  let last = 0
  return async function get(url, { redirect = 'manual' } = {}) {
    const wait = last + delay - Date.now()
    if (wait > 0) await sleep(wait)
    last = Date.now()
    const res = await fetch(url, { redirect, headers: { 'user-agent': 'nbi-seo-check/1 (+https://ianexora.com)' } })
    const body = res.status >= 300 && res.status < 400 ? '' : await res.text()
    return { status: res.status, location: res.headers.get('location'), body }
  }
}

function parsePage(html) {
  const head = html
  const title = decode(head.match(/<title[^>]*>([\s\S]*?)<\/title>/i)?.[1] ?? '').trim()
  const metas = [...head.matchAll(/<meta\b[^>]*>/gi)].map((m) => attrs(m[0]))
  const meta = (key) => metas.find((m) => m.property === key || m.name === key)?.content
  const links = [...head.matchAll(/<link\b[^>]*>/gi)].map((m) => attrs(m[0]))
  const canonical = links.find((l) => l.rel === 'canonical')?.href
  const ld = [...html.matchAll(/<script[^>]*type="application\/ld\+json"[^>]*>([\s\S]*?)<\/script>/gi)].map((m) => m[1])
  const h1 = (html.match(/<h1\b/gi) ?? []).length
  const hrefs = [...html.matchAll(/<a\b[^>]*\shref="([^"]+)"/gi)].map((m) => decode(m[1]))
  return {
    title,
    description: meta('description'),
    robots: meta('robots'),
    ogTitle: meta('og:title'),
    ogImage: meta('og:image'),
    ogUrl: meta('og:url'),
    twitterTitle: meta('twitter:title'),
    canonical,
    ld,
    h1,
    hrefs,
  }
}

function nodesOf(ld) {
  const nodes = []
  const errors = []
  for (const raw of ld) {
    let data
    try {
      data = JSON.parse(raw)
    } catch (e) {
      errors.push(`JSON-LD no parsea: ${e.message}`)
      continue
    }
    for (const doc of Array.isArray(data) ? data : [data]) {
      if (!doc['@context']) errors.push('JSON-LD sin @context')
      const graph = Array.isArray(doc['@graph']) ? doc['@graph'] : [doc]
      for (const n of graph) {
        if (!n['@type']) errors.push(`nodo sin @type${n['@id'] ? ` (${n['@id']})` : ''}`)
        nodes.push(n)
      }
    }
  }
  return { nodes, errors }
}

const types = (n) => [].concat(n['@type'] ?? [])
const isType = (n, t) => types(n).includes(t)
const UTC_MIDNIGHT = /T00:00:00(?:\.0+)?Z$/
const HAS_ZONE = /T\d\d:\d\d(?::\d\d(?:\.\d+)?)?(?:Z|[+-]\d\d:\d\d)$/

async function readSitemap(get, url, siteToLocal, seen = new Set()) {
  if (seen.has(url)) return []
  seen.add(url)
  const res = await get(siteToLocal(url), { redirect: 'follow' })
  if (res.status !== 200) throw new Error(`sitemap ${url} → ${res.status}`)
  const xml = res.body
  if (/<sitemapindex/i.test(xml)) {
    const out = []
    for (const m of xml.matchAll(/<loc>([\s\S]*?)<\/loc>/g)) out.push(...(await readSitemap(get, decode(m[1].trim()), siteToLocal, seen)))
    return out
  }
  return [...xml.matchAll(/<url>([\s\S]*?)<\/url>/g)].map((m) => ({
    loc: decode(m[1].match(/<loc>([\s\S]*?)<\/loc>/)?.[1].trim() ?? ''),
    lastmod: m[1].match(/<lastmod>([\s\S]*?)<\/lastmod>/)?.[1].trim(),
    priority: /<priority>/.test(m[1]),
    changefreq: /<changefreq>/.test(m[1]),
  }))
}

async function auditOrigin({ origin, site, delay }) {
  const local = origin !== site
  const siteToLocal = (u) => (local ? u.replace(site, origin) : u)
  const get = client(origin, { delay })
  const issues = []
  const add = (level, url, msg) => issues.push({ level, url, msg })

  const urls = await readSitemap(get, `${site}/sitemap.xml`, siteToLocal)
  const pages = []

  /* lastmod: the same timestamp with a time component on several URLs, close to now. */
  const byStamp = new Map()
  for (const u of urls) {
    if (!u.lastmod) {
      add('warn', u.loc, 'sin lastmod')
      continue
    }
    /* A real date is a day (or its midnight); the build instant carries a clock time. */
    if (/T\d\d:\d\d/.test(u.lastmod) && !/T00:00(?::00(?:\.0+)?)?(?:Z|[+-]\d\d:\d\d)?$/.test(u.lastmod))
      byStamp.set(u.lastmod, [...(byStamp.get(u.lastmod) ?? []), u.loc])
    if (u.priority || u.changefreq) add('warn', u.loc, 'el sitemap emite priority/changefreq')
  }
  for (const [stamp, locs] of byStamp) {
    const age = Date.now() - Date.parse(stamp)
    if (locs.length > 1 && age >= 0 && age < 48 * 3600e3)
      for (const l of locs) add('block', l, `lastmod = instante del build (${stamp}, en ${locs.length} URLs)`)
  }

  const internalHrefs = new Map()
  for (const u of urls) {
    const res = await get(siteToLocal(u.loc))
    if (res.status !== 200) {
      add('block', u.loc, `HTTP ${res.status}${res.location ? ` → ${res.location}` : ''}`)
      continue
    }
    const p = parsePage(res.body)
    const { nodes, errors } = nodesOf(p.ld)
    const noindex = /noindex/i.test(p.robots ?? '')
    pages.push({ url: u.loc, ...p, ld: undefined, hrefs: undefined, noindex, types: nodes.map(types).flat() })

    if (noindex) add('block', u.loc, 'noindex anunciada en el sitemap')
    if (!p.ogTitle) add('block', u.loc, 'sin og:title')
    else if (AUTHOR_NAMES.includes(p.ogTitle.trim()) && p.ogTitle.trim() !== p.title) add('block', u.loc, `og:title = nombre del autor («${p.ogTitle}»)`)
    if (p.twitterTitle && AUTHOR_NAMES.includes(p.twitterTitle.trim()) && p.twitterTitle.trim() !== p.title)
      add('block', u.loc, `twitter:title = nombre del autor («${p.twitterTitle}»)`)
    if (!p.ogImage) add('block', u.loc, 'sin og:image')
    if (p.canonical && p.ogUrl && p.ogUrl.replace(/\/$/, '') !== p.canonical.replace(/\/$/, '')) add('block', u.loc, `og:url (${p.ogUrl}) ≠ canónica (${p.canonical})`)
    if (!p.canonical) add('warn', u.loc, 'sin canónica')
    else if (p.canonical.replace(/\/$/, '') !== u.loc.replace(/\/$/, '')) add('warn', u.loc, `canónica a otra URL (${p.canonical})`)
    if (p.h1 !== 1) add('warn', u.loc, `${p.h1} H1`)
    if (!p.description) add('warn', u.loc, 'sin descripción')
    else if (p.description.length < 100 || p.description.length > 160) add('warn', u.loc, `descripción de ${p.description.length} caracteres`)
    if (p.title.length > 60) add('warn', u.loc, `título de ${p.title.length} caracteres`)

    for (const e of errors) add('block', u.loc, e)
    if (!noindex && p.ld.length === 0) add('block', u.loc, 'página indexable sin JSON-LD')
    for (const n of nodes) {
      if (isType(n, 'Article') || isType(n, 'BlogPosting') || isType(n, 'TechArticle')) {
        if (!n.image) add('block', u.loc, `${types(n).join('/')} sin image`)
        for (const k of ['datePublished', 'dateModified']) {
          const d = n[k]
          if (!d) add('warn', u.loc, `${types(n).join('/')} sin ${k}`)
          else if (UTC_MIDNIGHT.test(d)) add('block', u.loc, `${k} a medianoche UTC (${d})`)
          else if (!HAS_ZONE.test(d)) add('block', u.loc, `${k} sin hora ni zona (${d})`)
        }
      }
    }

    for (const h of p.hrefs) {
      let abs
      try {
        abs = new URL(h, u.loc)
      } catch {
        continue
      }
      if (abs.origin !== new URL(site).origin) continue
      if (/^\/_next\/|\.(png|jpe?g|webp|gif|svg|ico|pdf|mp4|webm|vtt|txt|xml|json)$/i.test(abs.pathname)) continue
      const key = abs.origin + abs.pathname
      internalHrefs.set(key, [...(internalHrefs.get(key) ?? []), u.loc])
    }
  }

  /* Internal links that land on a redirect. */
  const known = new Set(urls.map((u) => u.loc.replace(/\/$/, '')))
  for (const [href, from] of internalHrefs) {
    if (known.has(href.replace(/\/$/, ''))) continue
    const res = await get(siteToLocal(href))
    if (res.status >= 300 && res.status < 400) {
      for (const f of new Set(from)) add('block', f, `enlace interno a ${new URL(href).pathname}, que redirige (${res.status} → ${res.location})`)
    } else if (res.status >= 400) {
      for (const f of new Set(from)) add('warn', f, `enlace interno a ${new URL(href).pathname}, que da ${res.status}`)
    }
  }

  /* Titles and descriptions repeated across indexable pages. */
  for (const key of ['title', 'description']) {
    const seen = new Map()
    for (const p of pages.filter((x) => !x.noindex && x[key])) seen.set(p[key], [...(seen.get(p[key]) ?? []), p.url])
    for (const [v, list] of seen) if (list.length > 1) for (const l of list) add('warn', l, `${key} repetido en ${list.length} páginas («${v.slice(0, 60)}»)`)
  }

  return { site, origin, urls, pages, issues }
}

async function personOf({ origin, site, delay, paths }) {
  const get = client(origin, { delay })
  const found = []
  for (const path of paths) {
    const res = await get(`${origin}${path}`, { redirect: 'follow' })
    if (res.status !== 200) continue
    const { nodes } = nodesOf(parsePage(res.body).ld)
    for (const n of nodes) if (isType(n, 'Person')) found.push({ path, id: n['@id'], name: n.name, sameAs: [].concat(n.sameAs ?? []) })
  }
  return { site, found }
}

function comparePersons(a, b) {
  const issues = []
  const pick = (r) => r.found.find((p) => p.id === PERSON_ID)
  const pa = pick(a)
  const pb = pick(b)
  for (const [r, p] of [
    [a, pa],
    [b, pb],
  ]) {
    if (!p) issues.push({ level: 'block', url: r.site, msg: `ningún Person con @id ${PERSON_ID} (hay: ${r.found.map((x) => x.id).join(', ') || 'ninguno'})` })
    for (const other of r.found.filter((x) => x.id !== PERSON_ID))
      issues.push({ level: 'block', url: `${r.site}${other.path}`, msg: `Person con otro @id: ${other.id}` })
  }
  if (pa && pb) {
    if (pa.name !== pb.name) issues.push({ level: 'block', url: PERSON_ID, msg: `name distinto: «${pa.name}» / «${pb.name}»` })
    const sa = [...new Set(pa.sameAs)].sort()
    const sb = [...new Set(pb.sameAs)].sort()
    const onlyA = sa.filter((x) => !sb.includes(x))
    const onlyB = sb.filter((x) => !sa.includes(x))
    if (onlyA.length || onlyB.length)
      issues.push({ level: 'block', url: PERSON_ID, msg: `sameAs distinto. Solo en ${a.site}: ${onlyA.join(', ') || '—'}. Solo en ${b.site}: ${onlyB.join(', ') || '—'}` })
  }
  for (const r of [a, b])
    for (const p of r.found)
      for (const s of p.sameAs) {
        const twin = s.endsWith('/') ? s.slice(0, -1) : `${s}/`
        if (p.sameAs.includes(twin) || [a, b].some((x) => x.found.some((y) => y.sameAs.includes(twin))))
          issues.push({ level: 'block', url: `${r.site}${p.path}`, msg: `sameAs con y sin barra final: ${s}` })
      }
  return issues
}

function report(results, crossIssues) {
  const all = [...results.flatMap((r) => r.issues), ...crossIssues]
  const lines = []
  for (const r of results) {
    const b = r.issues.filter((i) => i.level === 'block')
    const w = r.issues.filter((i) => i.level === 'warn')
    lines.push(`\n## ${r.site}${r.origin !== r.site ? ` (servido en ${r.origin})` : ''}`)
    lines.push(`${r.urls.length} URLs en el sitemap · ${r.pages.length} con 200 · ${b.length} bloqueantes · ${w.length} avisos`)
    const group = (list) => {
      const by = new Map()
      const keyOf = (m) => m.replace(/\(.*\)/, '(…)').replace(/«.*»/, '«…»').replace(/\d+/g, 'N')
      for (const i of list) by.set(keyOf(i.msg), [...(by.get(keyOf(i.msg)) ?? []), i])
      for (const [msg, items] of by) {
        lines.push(`- ${msg} — ${items.length}`)
        for (const i of items.slice(0, 6)) lines.push(`    ${i.url}  ${i.msg}`)
        if (items.length > 6) lines.push(`    … y ${items.length - 6} más`)
      }
    }
    if (b.length) {
      lines.push('### Bloqueantes')
      group(b)
    }
    if (w.length) {
      lines.push('### Avisos')
      group(w)
    }
  }
  if (crossIssues.length) {
    lines.push('\n## Entre dominios')
    for (const i of crossIssues) lines.push(`- [${i.level}] ${i.url}: ${i.msg}`)
  }
  const blocks = all.filter((i) => i.level === 'block').length
  lines.push(`\nTotal: ${blocks} bloqueantes, ${all.length - blocks} avisos.`)
  return { text: lines.join('\n'), blocks }
}

async function main() {
  const delayFor = (origin) => Number(args.delay ?? (/localhost|127\.0\.0\.1/.test(origin) ? 0 : 1500))
  const targets = []
  if (args.local) {
    const origin = args.local === true ? 'http://localhost:3000' : String(args.local).replace(/\/$/, '')
    if (!args.site) throw new Error('--local necesita --site <origen público>, para reescribir las URLs del sitemap')
    targets.push({ origin, site: String(args.site).replace(/\/$/, '') })
  } else if (args.origin) {
    const o = String(args.origin).replace(/\/$/, '')
    targets.push({ origin: o, site: o })
  } else throw new Error('falta --origin <url> o --local <url> --site <url>')

  const results = []
  for (const t of targets) results.push(await auditOrigin({ ...t, delay: delayFor(t.origin) }))

  let crossIssues = []
  if (args.compare) {
    const t = targets[0]
    const other = String(args.compare).replace(/\/$/, '')
    const otherLocal = args['compare-local'] ? String(args['compare-local']).replace(/\/$/, '') : other
    const pathsFor = (site) =>
      site.includes('kata.') ? ['/', '/sobre-mi'] : ['/', new URL(PERSON_ID).pathname]
    const a = await personOf({ ...t, delay: delayFor(t.origin), paths: pathsFor(t.site) })
    const b = await personOf({ origin: otherLocal, site: other, delay: delayFor(otherLocal), paths: pathsFor(other) })
    crossIssues = comparePersons(a, b)
  }

  const { text, blocks } = report(results, crossIssues)
  console.log(text)
  if (args.json) {
    const { writeFileSync } = await import('node:fs')
    writeFileSync(String(args.json), JSON.stringify({ when: new Date().toISOString(), results, crossIssues }, null, 2))
  }
  process.exit(blocks > 0 ? 1 : 0)
}

main().catch((e) => {
  console.error(`check.mjs: ${e.message}`)
  process.exit(2)
})
