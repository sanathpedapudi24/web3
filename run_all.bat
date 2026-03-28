@echo off

REM === START HARDHAT NODE (BLOCKCHAIN) ===
start cmd /k "cd /d C:\web3\smart-contracts && npx hardhat node"

REM === DEPLOY CONTRACTS (wait a bit first) ===
timeout /t 5 > nul
start cmd /k "cd /d C:\web3\smart-contracts && npx hardhat run scripts/deploy.js --network localhost"

REM === START BACKEND ===
start cmd /k "cd /d C:\hackathon\backend && venv\Scripts\activate && uvicorn main:app --reload"

REM === START FRONTEND ===
start cmd /k "cd /d C:\web3\frontend && npm run dev"

pause
