# Pilote Microsoft Word pour recalculer le sommaire et la pagination, puis
# exporter un PDF de contrôle.
#
# Le sommaire d'un .docx produit par une librairie est un champ vide : seul un
# traitement de texte sait le remplir. Sans ce passage, le lecteur ouvre le
# document sur un sommaire blanc.
#
# Les objets COM sont libérés explicitement : sans cela, Word survit sans
# fenêtre visible et garde le fichier verrouillé, ce qui fait échouer la
# génération suivante avec un message incompréhensible.
param(
  [Parameter(Mandatory = $true)][string]$Docx,
  [Parameter(Mandatory = $true)][string]$Pdf
)

$ErrorActionPreference = 'Stop'
$wdExportFormatPDF = 17
$word = $null
$doc = $null

# Word résout les chemins relatifs depuis *son* répertoire de travail, pas
# depuis celui de l'appelant : « build/Guide.docx » lui est introuvable même
# lancé au bon endroit. On passe donc des chemins absolus, toujours.
if (-not (Test-Path $Docx)) {
  Write-Error "Document introuvable : $Docx"
  exit 3
}
$Docx = (Resolve-Path -LiteralPath $Docx).Path
if (-not [System.IO.Path]::IsPathRooted($Pdf)) {
  $Pdf = [System.IO.Path]::GetFullPath((Join-Path (Get-Location).Path $Pdf))
}

# Le document est-il déjà ouvert ? Word dépose alors un fichier de verrouillage
# « ~$nom.docx » à côté. Écraser un document ouvert échouerait de toute façon :
# autant le dire clairement plutôt que de laisser une erreur COM illisible.
$verrou = Join-Path (Split-Path $Docx) ("~$" + [System.IO.Path]::GetFileName($Docx))
if (Test-Path $verrou) {
  Write-Error "Le document est ouvert dans Word : fermez-le puis relancez.`n  $Docx"
  exit 2
}

# Word était-il déjà lancé ? Si oui, on ne le quittera pas à la fin : appeler
# Quit() fermerait les documents que l'utilisateur a ouverts.
$wordDejaLance = [bool](Get-Process WINWORD -ErrorAction SilentlyContinue)

try {
  $word = New-Object -ComObject Word.Application
  if (-not $wordDejaLance) { $word.Visible = $false }
  $word.DisplayAlerts = 0

  $doc = $word.Documents.Open($Docx, $false, $false)

  # Le sommaire d'abord, la pagination ensuite : l'ordre inverse laisserait des
  # numéros de page calculés sur un sommaire encore vide.
  foreach ($toc in $doc.TablesOfContents) { $toc.Update() | Out-Null }
  $doc.Fields.Update() | Out-Null
  $doc.Repaginate()

  # On réenregistre pour que le .docx livré contienne lui aussi le sommaire
  # calculé, et pas seulement le PDF.
  $doc.Save()
  $doc.ExportAsFixedFormat($Pdf, $wdExportFormatPDF)

  $pages = $doc.ComputeStatistics(2)   # wdStatisticPages
  $mots = $doc.ComputeStatistics(0)    # wdStatisticWords
  Write-Output "PAGES=$pages"
  Write-Output "MOTS=$mots"
}
finally {
  if ($doc) {
    $doc.Close(0)
    [System.Runtime.InteropServices.Marshal]::ReleaseComObject($doc) | Out-Null
    $doc = $null
  }
  if ($word) {
    # On ne quitte Word que si c'est nous qui l'avons lancé. Sinon on relâche
    # simplement la référence : les documents de l'utilisateur restent ouverts.
    if (-not $wordDejaLance) { $word.Quit() }
    [System.Runtime.InteropServices.Marshal]::ReleaseComObject($word) | Out-Null
    $word = $null
  }
  [GC]::Collect()
  [GC]::WaitForPendingFinalizers()
  [GC]::Collect()
}
