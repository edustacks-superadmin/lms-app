# Sync exams on LOCALHOST in batches
$baseUrl = "http://localhost:3000/api/testpress/sync-exams-batch"
$currentPage = 1
$totalCreated = 0
$totalUpdated = 0
$batchNumber = 1

Write-Host "🚀 Starting LOCAL batched exam sync..." -ForegroundColor Green
Write-Host "Processing 500 exams per batch`n" -ForegroundColor Cyan

while ($true) {
    Write-Host "📦 Batch $batchNumber - Page $currentPage..." -ForegroundColor Cyan
    
    $body = @{ startPage = $currentPage } | ConvertTo-Json

    try {
        $response = Invoke-WebRequest -Uri $baseUrl -Method POST -UseBasicParsing -ContentType "application/json" -Body $body
        $data = $response.Content | ConvertFrom-Json

        if ($data.success) {
            $totalCreated += $data.batch.created
            $totalUpdated += $data.batch.updated
            
            Write-Host "  ✅ Created: $($data.batch.created) | Updated: $($data.batch.updated)" -ForegroundColor Green
            Write-Host "  📊 Total: $totalCreated created, $totalUpdated updated`n" -ForegroundColor Yellow

            if ($data.hasMore -eq $false -or $null -eq $data.nextPage) {
                Write-Host "🎉 COMPLETE! Created: $totalCreated | Updated: $totalUpdated" -ForegroundColor Green
                break
            }

            $currentPage = $data.nextPage
            $batchNumber++
            Start-Sleep -Seconds 1
        }
        else {
            Write-Host "❌ Failed" -ForegroundColor Red
            break
        }
    }
    catch {
        Write-Host "❌ Error: $_" -ForegroundColor Red
        Write-Host "Resume from page: $currentPage" -ForegroundColor Yellow
        break
    }
}
