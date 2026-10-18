$page = 3  # Starting from page 3 (batch 1-2 already done)
$totalCreated = 0
$totalUpdated = 0
$batch = 2

Write-Host "`n🚀 Syncing remaining exams..." -ForegroundColor Green

while ($page) {
    Write-Host "`n📦 Batch $batch (Page $page)..." -ForegroundColor Cyan
    
    $response = Invoke-WebRequest -Uri "http://localhost:3000/api/testpress/sync-exams-batch" -Method POST -UseBasicParsing -ContentType "application/json" -Body "{`"startPage`":$page}"
    $data = $response.Content | ConvertFrom-Json
    
    $totalCreated += $data.batch.created
    $totalUpdated += $data.batch.updated
    
    Write-Host "  ✅ Created: $($data.batch.created) | Updated: $($data.batch.updated) | Time: $($data.batch.syncTimeSeconds)s" -ForegroundColor Green
    Write-Host "  📊 Total: $totalCreated created, $totalUpdated updated" -ForegroundColor Yellow
    
    $page = $data.nextPage
    $batch++
    
    if (-not $data.hasMore) {
        Write-Host "`n🎉 ALL DONE! Final: $totalCreated created, $totalUpdated updated" -ForegroundColor Green
        break
    }
    
    Start-Sleep -Milliseconds 500
}
