#!/bin/bash

# Check if Node.js is installed
if ! command -v node &> /dev/null; then
    echo "Node.js is not installed. Installing Node.js..."
    
    # Check the operating system
    if [[ "$OSTYPE" == "darwin"* ]]; then
        # macOS
        if ! command -v brew &> /dev/null; then
            echo "Installing Homebrew..."
            /bin/bash -c "$(curl -fsSL https://raw.githubusercontent.com/Homebrew/install/HEAD/install.sh)"
        fi
        brew install node
    elif [[ "$OSTYPE" == "linux-gnu"* ]]; then
        # Linux
        curl -fsSL https://deb.nodesource.com/setup_lts.x | sudo -E bash -
        sudo apt-get install -y nodejs
    else
        echo "Unsupported operating system"
        exit 1
    fi
fi

# Create React project using Vite
echo "Creating React project with Vite..."
npm create vite@latest fantasy-frontend -- --template react-ts

# Navigate to project directory
cd fantasy-frontend || exit

# Install dependencies
echo "Installing dependencies..."
npm install
npm install @tanstack/react-table axios @mantine/core@7.3.2 @mantine/hooks@7.3.2 @emotion/react
npm install -D @types/react @types/node @types/axios typescript @types/react-dom

# Create necessary directories
echo "Creating project structure..."
mkdir -p src/components
mkdir -p src/services
mkdir -p src/types

# Create empty files
echo "Creating empty TypeScript files..."
touch src/types/fantasy.ts
touch src/services/api.ts
touch src/components/FantasyTable.tsx

echo "Setup complete! Directory structure created."
echo "Next steps:"
echo "1. Update the TypeScript files with the provided code"
echo "2. Run 'npm run dev' to start the development server"

# Return to original directory
cd .. 