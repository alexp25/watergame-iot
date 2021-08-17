echo "archive starting"
echo $PWD

echo "removing previous archive"
rm "archive.zip"
echo "building"
npm run build
echo "creating archive"
zip -r archive.zip . -x node_modules\* -x create_archive.bat -x create_archive.sh -x archive.zip\* -x script\* -x .vscode\*
echo "done"