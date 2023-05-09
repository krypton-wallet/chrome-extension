export INLINE_RUNTIME_CHUNK=false
npx next build
npx next export
mv ./out/_next ./out/next
cd ./out 
grep -rli '_next' * | xargs -I@ sed -i 's|/_next|/next|g' @
cd ..
npx esbuild ./public/background.js ./public/content.js ./public/script.js --bundle --minify --target=chrome58 --outdir=./out