import type { NextConfig } from "next";

// Get basePath from environment variable (set by GitHub Actions)
// If GITHUB_REPOSITORY is username.github.io, basePath is empty
// Otherwise, basePath is /<repo-name>
const getBasePath = (): string => {
  const repoName = process.env.GITHUB_REPOSITORY?.split('/')[1] || '';
  const githubUsername = process.env.GITHUB_REPOSITORY?.split('/')[0] || '';
  
  // Check if repository name is username.github.io
  if (repoName === `${githubUsername}.github.io` || !repoName) {
    return '';
  }
  
  // For other repositories, use /<repo-name> as basePath
  return `/${repoName}`;
};

const basePath = getBasePath();
const isStaticExport = process.env.NEXT_EXPORT === 'true' || process.env.OUTPUT === 'export';

const nextConfig: NextConfig = {
  ...(basePath && { basePath }),
  ...(isStaticExport && { output: 'export' }),
  // Note: headers() is not supported in static export mode
  // For GitHub Pages, headers need to be set via _headers file or meta tags
  ...(!isStaticExport && {
    headers() {
      // Required by FHEVM 
      return Promise.resolve([
        {
          source: '/',
          headers: [
            {
              key: 'Cross-Origin-Opener-Policy',
              value: 'same-origin',
            },
            {
              key: 'Cross-Origin-Embedder-Policy',
              value: 'require-corp',
            },
          ],
        },
      ]);
    }
  }),
  // Disable image optimization for static export
  ...(isStaticExport && {
    images: {
      unoptimized: true,
    },
  }),
};

export default nextConfig;

