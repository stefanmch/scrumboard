#!/usr/bin/env node

/**
 * Test Runner Script
 *
 * This script provides shortcuts for running specific test suites
 * Usage: node test-runner.js [command]
 */

const { spawn } = require('child_process')

const commands = {
  unit: {
    description: 'Run all unit tests',
    command: 'npx jest src/components'
  },
  integration: {
    description: 'Run all integration tests',
    command: 'npx jest src/__tests__/integration'
  },
  modal: {
    description: 'Run modal component tests',
    command: 'npx jest src/components/modals'
  },
  board: {
    description: 'Run board component tests',
    command: 'npx jest src/components/board'
  },
  workflows: {
    description: 'Run story workflow tests',
    command: 'npx jest story-workflows.test.tsx'
  },
  validation: {
    description: 'Run form validation tests',
    command: 'npx jest form-validation.test.tsx'
  },
  dnd: {
    description: 'Run drag and drop tests',
    command: 'npx jest drag-and-drop.test.tsx'
  },
  coverage: {
    description: 'Run all tests with coverage',
    command: 'npx jest --coverage'
  },
  watch: {
    description: 'Run tests in watch mode',
    command: 'npx jest --watch'
  }
}

function runCommand(cmd) {
  console.log(`Running: ${cmd}\n`)

  const [command, ...args] = cmd.split(' ')
  const child = spawn(command, args, {
    stdio: 'inherit',
    shell: true
  })

  child.on('error', (error) => {
    console.error(`Error: ${error.message}`)
    process.exit(1)
  })

  child.on('close', (code) => {
    if (code !== 0) {
      console.error(`Command failed with exit code ${code}`)
      process.exit(code)
    }
  })
}

function showHelp() {
  console.log('Available test commands:\n')

  Object.entries(commands).forEach(([key, { description }]) => {
    console.log(`  ${key.padEnd(12)} - ${description}`)
  })

  console.log('\nUsage:')
  console.log('  node test-runner.js [command]')
  console.log('  npm test                    # Run all tests')
  console.log('  node test-runner.js unit    # Run unit tests only')
  console.log('  node test-runner.js coverage # Run with coverage')
}

// Main execution
const command = process.argv[2]

if (!command || command === 'help' || command === '--help') {
  showHelp()
  process.exit(0)
}

if (commands[command]) {
  runCommand(commands[command].command)
} else {
  console.error(`Unknown command: ${command}`)
  console.log('\nRun "node test-runner.js help" to see available commands')
  process.exit(1)
}