$ErrorActionPreference = 'Stop'
Write-Host 'Abriendo https://tienda-cocis.18-189-6-193.sslip.io'
Write-Host 'Usuario: seminario. La contraseña está en .deploy-test\demo-password.txt'
Start-Process 'https://tienda-cocis.18-189-6-193.sslip.io'
