# podcast-coord

## New project structure:

```
podcast-coord/
├── index.html              # HTML entry point
├── package.json            # Dependencies (React, Vite, Tailwind)
├── vite.config.js          # Vite bundler config
├── tailwind.config.js      # Tailwind CSS config
├── postcss.config.js       # PostCSS config
├── .gitignore              # Git ignore rules
└── src/
    ├── index.jsx           # React entry point
    ├── index.css           # Tailwind directives + custom scrollbar
    ├── App.jsx             # Main BlogToPodcast component
    └── components/
        ├── Button.jsx      # Reusable Button component
        ├── Card.jsx        # Reusable Card component
        └── HostConfig.jsx  # Host configuration form component
```

## To run the app:

```
nvm use 24 # If the default npm version is too old
npm install # If first time running the web
npm run dev
```
