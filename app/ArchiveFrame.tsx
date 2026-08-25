type ArchiveFrameProps = {
  archivePath: string;
  title: string;
};

export function ArchiveFrame({ archivePath, title }: ArchiveFrameProps) {
  return (
    <main className="archive-shell">
      <iframe className="archive-frame" src={archivePath} title={title} />
    </main>
  );
}
