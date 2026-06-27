$ErrorActionPreference = "Stop"
$root = Split-Path -Parent $PSScriptRoot
$seed = Join-Path $root "docs\seed"

function Read-Json($path) {
  $txt = Get-Content -Raw -Encoding UTF8 $path
  return ($txt | ConvertFrom-Json)
}

# Subjects: assign sequential ids and build slug->id map
$subjects = @(Read-Json (Join-Path $seed "subjects.json"))
$slugToId = @{}
$sid = 1
foreach ($s in $subjects) {
  $s | Add-Member -NotePropertyName id -NotePropertyValue $sid -Force
  $slugToId[$s.slug] = $sid
  $sid++
}

# Helper: load seed files matching patterns, map subject_slug -> subject_id, drop slug
function Load-Mapped($patterns) {
  $list = New-Object System.Collections.Generic.List[object]
  $rid = 1
  foreach ($pat in $patterns) {
    $files = @(Get-ChildItem -Path (Join-Path $seed $pat) -File | Sort-Object Name)
    foreach ($f in $files) {
      $rows = @(Read-Json $f.FullName)
      foreach ($row in $rows) {
        $mapped = $slugToId[$row.subject_slug]
        if ($null -eq $mapped) { continue }
        $row | Add-Member -NotePropertyName subject_id -NotePropertyValue $mapped -Force
        $row | Add-Member -NotePropertyName id -NotePropertyValue $rid -Force
        $null = $row.PSObject.Properties.Remove("subject_slug")
        $null = $row.PSObject.Properties.Remove("company")
        $list.Add($row)
        $rid++
      }
    }
  }
  return $list.ToArray()
}

$mcqs      = @(Load-Mapped @("mcqs.json", "mcqs_*.json"))
$tutorials = @(Load-Mapped @("tutorials.json"))
$notes     = @(Load-Mapped @("notes.json"))
$coding    = @(Load-Mapped @("coding.json", "coding_*.json"))

$data = [ordered]@{
  subjects  = @($subjects)
  mcqs      = $mcqs
  tutorials = $tutorials
  notes     = $notes
  coding    = $coding
}

$json = $data | ConvertTo-Json -Depth 8 -Compress
$out = "window.VLSI_DATA = " + $json + ";`n"
$target = Join-Path $root "web\data.js"
[System.IO.File]::WriteAllText($target, $out, (New-Object System.Text.UTF8Encoding($false)))

Write-Host ("Subjects: {0}  MCQs: {1}  Tutorials: {2}  Notes: {3}  Coding: {4}" -f $subjects.Count, $mcqs.Count, $tutorials.Count, $notes.Count, $coding.Count)
