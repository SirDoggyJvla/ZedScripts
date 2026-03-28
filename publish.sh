set -euo pipefail

UPDATE_TYPE="${1:-patch}"

# run tests
npx @vscode/test-cli
npm run test:jest

# publish to registries (VS Code Marketplace and Open VSX)
vsce publish "$UPDATE_TYPE"
npx ovsx publish

# get version from package.json
VERSION=$(node -e "console.log(require('./package.json').version)")

# release to GitHub
git push --tags
vsce package
gh release create "v$VERSION" "project-zomboid-scripts-$VERSION.vsix" --notes "See [Changelog](https://github.com/SirDoggyJvla/ZedScripts/blob/main/README.md#Changelog) for details"
git push