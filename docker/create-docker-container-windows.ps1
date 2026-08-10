# create-docker-container-windows.ps1

$ErrorActionPreference = "Stop"

$ImageName = "chess"
$ContainerName = "chess"

$ProjectRoot = (Resolve-Path (Join-Path $PSScriptRoot "..")).Path
$Dockerfile = Join-Path $ProjectRoot "docker\Dockerfile"

$ContainerIds = @(docker.exe ps -aq --filter "name=^/$ContainerName$")

if ($ContainerIds.Count -gt 0 -and $ContainerIds[0]) {
    Write-Host "Stopping and removing container $ContainerName..."

    foreach ($ContainerId in $ContainerIds) {
        docker.exe stop $ContainerId

        if ($LASTEXITCODE -ne 0) {
            throw "docker stop failed with exit code $LASTEXITCODE"
        }

        docker.exe rm $ContainerId

        if ($LASTEXITCODE -ne 0) {
            throw "docker rm failed with exit code $LASTEXITCODE"
        }
    }
}
else {
    Write-Host "No container found with the name $ContainerName."
}

$ImageIds = @(docker.exe images -q $ImageName)

if ($ImageIds.Count -gt 0 -and $ImageIds[0]) {
    Write-Host "Removing Docker image $ImageName..."

    foreach ($ImageId in $ImageIds) {
        docker.exe rmi $ImageId

        if ($LASTEXITCODE -ne 0) {
            throw "docker rmi failed with exit code $LASTEXITCODE"
        }
    }
}
else {
    Write-Host "No Docker image found with the name $ImageName."
}

Write-Host "Building Docker image $ImageName without cache..."

docker.exe build `
    --no-cache `
    -f $Dockerfile `
    -t $ImageName `
    $ProjectRoot

if ($LASTEXITCODE -ne 0) {
    throw "docker build failed with exit code $LASTEXITCODE"
}

Write-Host "Starting container $ContainerName..."

docker.exe run `
    -d `
    -p 80:80 `
    -p 443:443 `
    --name $ContainerName `
    $ImageName

if ($LASTEXITCODE -ne 0) {
    throw "docker run failed with exit code $LASTEXITCODE"
}

Write-Host ""
Write-Host "The container was successfully created and started."
Write-Host "Access through https://127.0.0.1/"
