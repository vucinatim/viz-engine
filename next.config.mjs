/** @type {import('next').NextConfig} */
const nextConfig = {
  webpack: (config) => {
    // Handle FBX files as assets (for Three.js models)
    config.module.rules.push({
      test: /\.(fbx|glb|gltf)$/,
      type: 'asset/resource',
      generator: {
        filename: 'static/models/[name][ext]',
      },
    });

    // Handle texture files that come with FBX models
    config.module.rules.push({
      test: /\.(png|jpe?g|gif|bmp|tga)$/i,
      include: /models/,
      type: 'asset/resource',
      generator: {
        filename: 'static/textures/[name][ext]',
      },
    });

    // Handle ?url query parameter (Vite-style imports)
    config.module.rules.push({
      resourceQuery: /url/,
      type: 'asset/resource',
    });

    return config;
  },
};

export default nextConfig;
