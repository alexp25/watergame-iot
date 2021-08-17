@echo off
echo BAT directory is %~dp0
echo Current directory  is %CD%
pushd %~dp0

echo removing previous archive
del "%~dp0%\archive.zip"
echo building
call npm run build
echo creating archive
:: "C:\Program Files\7-Zip\7z.exe" a -tzip "%~dp0%\archive.zip" .\dist\* .\package.json
"C:\Program Files\7-Zip\7z.exe" a -tzip "%~dp0%\archive.zip" * -x^!node_modules -x^!create_archive.bat -x^!create_archive.sh -x^!archive.zip -x^!script -x^!.vscode
pushd %~dp0
pause