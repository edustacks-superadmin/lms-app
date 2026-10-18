# Sync all Testpress exams in batches
$baseUrl = "https://maheshiesacademy.edustacks.co.in/api/testpress/sync-exams-batch"
$currentPage = 1
$totalCreated = 0
$totalUpdated = 0
$batchNumber = 1

Write-Host "🚀 Starting batched exam sync for 23,000 exams..." -ForegroundColor Green
Write-Host "Processing 500 exams per batch`n" -ForegroundColor Cyan

while ($true) {
    Write-Host "📦 Batch $batchNumber - Processing page $currentPage..." -ForegroundColor Cyan
    
    $body = @{
        startPage = $currentPage
    } | ConvertTo-Json

    try {
        $response = Invoke-WebRequest -Uri $baseUrl -Method POST -UseBasicParsing -ContentType "application/json" -Body $body
        $data = $response.Content | ConvertFrom-Json

        if ($data.success) {
            $totalCreated += $data.batch.created
            $totalUpdated += $data.batch.updated
            
            Write-Host "  ✅ Created: $($data.batch.created) | Updated: $($data.batch.updated) | Time: $($data.batch.syncTimeSeconds)s" -ForegroundColor Green
            Write-Host "  📊 Running Total: $totalCreated created, $totalUpdated updated`n" -ForegroundColor Yellow

            if ($data.hasMore -eq $false -or $null -eq $data.nextPage) {
                Write-Host "🎉 ALL EXAMS SYNCED!" -ForegroundColor Green
                Write-Host "━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━" -ForegroundColor Green
                Write-Host "Final Statistics:" -ForegroundColor Cyan
                Write-Host "  • Total Created: $totalCreated" -ForegroundColor White
                Write-Host "  • Total Updated: $totalUpdated" -ForegroundColor White
                Write-Host "  • Batches Processed: $batchNumber" -ForegroundColor White
                Write-Host "━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━`n" -ForegroundColor Green
                break
            }

            $currentPage = $data.nextPage
            $batchNumber++
            
            # Brief pause between batches
            Start-Sleep -Seconds 2
        }
        else {
            Write-Host "❌ Sync failed for batch $batchNumber" -ForegroundColor Red
            break
        }
    }
    catch {
        Write-Host "❌ Error on batch $batchNumber`: $_" -ForegroundColor Red
        Write-Host "You can resume from page $currentPage by running:" -ForegroundColor Yellow
        Write-Host "  Invoke-WebRequest -Uri `"$baseUrl`" -Method POST -ContentType `"application/json`" -Body '{`"startPage`":$currentPage}'" -ForegroundColor Gray
        break
    }
}
