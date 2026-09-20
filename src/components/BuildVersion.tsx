import { useEffect, useState } from 'react';

type VersionManifest = {
  shortCommit?: string;
  commit?: string;
  environment?: string;
};

export const BuildVersion = () => {
  const [version, setVersion] = useState<VersionManifest | null>(null);

  useEffect(() => {
    let cancelled = false;
    void fetch('/version.json', { cache: 'no-store' })
      .then(response => response.ok ? response.json() as Promise<VersionManifest> : null)
      .then(manifest => {
        if (!cancelled && manifest) setVersion(manifest);
      })
      .catch(() => undefined);
    return () => { cancelled = true; };
  }, []);

  const commit = version?.shortCommit ?? 'dev';
  const environment = version?.environment && version.environment !== 'production'
    ? ` · ${version.environment}`
    : '';

  return (
    <span data-testid="build-version" title={version?.commit ?? 'Versão local'}>
      Build {commit}{environment}
    </span>
  );
};
