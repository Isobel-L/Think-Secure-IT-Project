Deploying Code:
rm -rf dist && mkdir dist
cp -r index.html css js pages languages Images robotimage assets dist/
npx wrangler pages deploy dist --project-name thinksecure --branch main
rm -rf dist
