/** @type {import('postcss-load-config').Config} */
const config = {
  plugins: {
    tailwindcss: { config: './tailwind.config.cjs' },
    autoprefixer: {},
  },
};

export default config;
