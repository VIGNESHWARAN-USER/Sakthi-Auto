@echo off
cd /d D:\OHC\OHC\sampleProject
call venv\Scripts\activate
python manage.py runsslserver ohc.jsw.in:9003 --certificate "D:/OHC/Certificates/CER/star_jsw_in.cer" --key "D:/OHC/Certificates/Private Key/star_jsw_in_Private.Key"
