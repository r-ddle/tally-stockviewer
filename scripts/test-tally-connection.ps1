# Test Tally Connection and Data Fetch
# This script tests the Tally API connection and parses the response

$ErrorActionPreference = "Stop"

$company = "Ralhum Trading Company (Pv) Ltd - 21/22"
$tallyUrl = "http://localhost:9000"

Write-Host "========================================" -ForegroundColor Cyan
Write-Host "TALLY STOCK VIEWER - CONNECTION TEST" -ForegroundColor Cyan
Write-Host "========================================" -ForegroundColor Cyan
Write-Host ""
Write-Host "Target: $tallyUrl"
Write-Host "Company: $company"
Write-Host ""

# Build the XML request (same format as our TypeScript code)
$xmlRequest = @"
<ENVELOPE>
<HEADER>
<VERSION>1</VERSION>
<TALLYREQUEST>Export</TALLYREQUEST>
<TYPE>Collection</TYPE>
<ID>StockItems</ID>
</HEADER>
<BODY>
<DESC>
<STATICVARIABLES>
<SVCURRENTCOMPANY>$company</SVCURRENTCOMPANY>
<SVEXPORTFORMAT>`$`$SysName:XML</SVEXPORTFORMAT>
</STATICVARIABLES>
<TDL>
<TDLMESSAGE>
<COLLECTION NAME="StockItems" ISMODIFY="No" ISINITIALIZE="Yes">
<TYPE>Stock Item</TYPE>
<NATIVEMETHOD>Name</NATIVEMETHOD>
<NATIVEMETHOD>Parent</NATIVEMETHOD>
<NATIVEMETHOD>BaseUnits</NATIVEMETHOD>
<NATIVEMETHOD>ClosingBalance</NATIVEMETHOD>
</COLLECTION>
</TDLMESSAGE>
</TDL>
</DESC>
</BODY>
</ENVELOPE>
"@

Write-Host "Sending request to Tally..." -ForegroundColor Yellow

try {
    $response = Invoke-WebRequest -Uri $tallyUrl -Method POST -Body $xmlRequest -ContentType "application/xml" -TimeoutSec 120

    Write-Host "Response received!" -ForegroundColor Green
    Write-Host "Status: $($response.StatusCode)" -ForegroundColor Green
    Write-Host "Content Length: $($response.Content.Length) bytes" -ForegroundColor Green
    Write-Host ""

    # Parse the XML
    [xml]$xml = $response.Content

    # Get stock items - handle the path correctly
    $collection = $xml.ENVELOPE.BODY.DATA.COLLECTION
    if ($null -eq $collection) {
        Write-Host "No COLLECTION element found - checking alternate paths..." -ForegroundColor Yellow
        $collection = $xml.COLLECTION
    }

    if ($null -ne $collection) {
        $stockItems = $collection.STOCKITEM
        $count = @($stockItems).Count

        Write-Host "========================================" -ForegroundColor Green
        Write-Host "SUCCESS: Found $count stock items" -ForegroundColor Green
        Write-Host "========================================" -ForegroundColor Green
        Write-Host ""

        # Show first 10 items as sample
        Write-Host "SAMPLE DATA (first 10 items):" -ForegroundColor Cyan
        Write-Host "--------------------------------------------"

        $sampleItems = @($stockItems) | Select-Object -First 10
        foreach ($item in $sampleItems) {
            $name = $item.NAME
            $parent = if ($item.PARENT.'#text') { $item.PARENT.'#text' } else { $item.PARENT }
            $baseUnits = if ($item.BASEUNITS.'#text') { $item.BASEUNITS.'#text' } else { $item.BASEUNITS }
            $closingBal = if ($item.CLOSINGBALANCE.'#text') { $item.CLOSINGBALANCE.'#text' } else { $item.CLOSINGBALANCE }

            Write-Host ""
            Write-Host "Name: $name" -ForegroundColor White
            Write-Host "  Brand: $parent" -ForegroundColor Gray
            Write-Host "  Unit: $baseUnits" -ForegroundColor Gray
            Write-Host "  Closing Balance: $closingBal" -ForegroundColor Gray
        }

        Write-Host ""
        Write-Host "--------------------------------------------"
        Write-Host ""

        # Parse some statistics
        $withStock = @($stockItems | Where-Object {
            $bal = if ($_.CLOSINGBALANCE.'#text') { $_.CLOSINGBALANCE.'#text' } else { $_.CLOSINGBALANCE }
            $bal -and $bal.Trim() -ne ""
        }).Count

        $noStock = $count - $withStock

        Write-Host "STATISTICS:" -ForegroundColor Cyan
        Write-Host "  Total Items: $count"
        Write-Host "  With Stock: $withStock"
        Write-Host "  Zero Stock: $noStock"

        # Get unique brands
        $brands = @($stockItems | ForEach-Object {
            if ($_.PARENT.'#text') { $_.PARENT.'#text' } else { $_.PARENT }
        } | Where-Object { $_ } | Select-Object -Unique)

        Write-Host "  Unique Brands: $($brands.Count)"
        Write-Host ""
        Write-Host "Top 10 Brands:"
        $brands | Select-Object -First 10 | ForEach-Object { Write-Host "    - $_" -ForegroundColor Gray }

    } else {
        Write-Host "ERROR: Could not find COLLECTION element in response" -ForegroundColor Red
        Write-Host "Response preview:"
        Write-Host ($response.Content.Substring(0, [Math]::Min(2000, $response.Content.Length)))
    }

} catch {
    Write-Host "ERROR: Failed to connect to Tally" -ForegroundColor Red
    Write-Host $_.Exception.Message -ForegroundColor Red
    Write-Host ""
    Write-Host "Make sure Tally ERP 9 is running and ODBC server is enabled on port 9000"
}
