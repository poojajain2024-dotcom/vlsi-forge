$ErrorActionPreference = 'Stop'
$base = 'http://127.0.0.1:8000/api/v1'
try {
  $t = Invoke-RestMethod "$base/content/subjects/1/tutorials"
  Write-Output "TUTORIALS: $($t.Count) total; first = $($t[0].title)"

  $iv = Invoke-RestMethod "$base/content/subjects/1/interview/mcqs"
  Write-Output "INTERVIEW MCQ free preview count = $($iv.Count)"

  $q = Invoke-RestMethod "$base/content/subjects/1/mcqs?limit=3"
  $ans = $q | ForEach-Object { @{ mcq_id = $_.id; selected_option = 'A' } }
  $quizBody = @{ subject_id = 1; time_seconds = 42; answers = $ans } | ConvertTo-Json -Depth 5
  $qr = Invoke-RestMethod "$base/progress/quiz/submit" -Method Post -ContentType 'application/json' -Body $quizBody
  Write-Output "QUIZ: $($qr.correct_count)/$($qr.total_questions) = $($qr.score_percent)% grade=$($qr.grade)"

  $cq = Invoke-RestMethod "$base/content/subjects/2/interview/coding"
  $cBody = @{ coding_question_id = $cq[0].id; tests_total = 4; tests_passed = 4; time_seconds = 120 } | ConvertTo-Json
  $cr = Invoke-RestMethod "$base/progress/coding/submit" -Method Post -ContentType 'application/json' -Body $cBody
  Write-Output "CODING: score=$($cr.score) all_passed=$($cr.all_passed) :: $($cr.message)"

  $fb = @{ rating = 5; comment = 'Great app, add more interview Qs'; display_name = 'Student A' } | ConvertTo-Json
  Invoke-RestMethod "$base/feedback" -Method Post -ContentType 'application/json' -Body $fb | Out-Null
  $fs = Invoke-RestMethod "$base/feedback/summary"
  Write-Output "FEEDBACK: avg=$($fs.average_rating) total=$($fs.total_reviews)"
}
catch {
  Write-Output "ERROR: $($_.Exception.Message)"
  if ($_.ErrorDetails) { Write-Output $_.ErrorDetails.Message }
}
