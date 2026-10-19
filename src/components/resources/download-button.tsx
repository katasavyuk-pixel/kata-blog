export function DownloadButton({ href }: { href: string }) {
  return (
    <a
      href={href}
      className="inline-flex h-11 items-center justify-center gap-2 rounded-sm bg-accent px-5 text-sm font-semibold text-on-accent transition-colors hover:bg-accent-strong"
    >
      Descargar tu recurso
    </a>
  )
}
