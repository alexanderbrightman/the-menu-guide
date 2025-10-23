#!/bin/bash

# Development optimization script for The Menu Guide
# This script helps optimize the development experience

echo "🚀 The Menu Guide - Development Optimizer"
echo "=========================================="

# Function to clean build cache
clean_cache() {
    echo "🧹 Cleaning build cache..."
    rm -rf .next
    rm -rf node_modules/.cache
    echo "✅ Cache cleaned!"
}

# Function to restart development server with optimizations
restart_dev() {
    echo "🔄 Restarting development server with optimizations..."
    
    # Kill any existing Next.js processes
    pkill -f "next dev" 2>/dev/null || true
    
    # Clean cache
    clean_cache
    
    # Start with optimizations
    echo "🚀 Starting optimized development server..."
    npm run dev
}

# Function to check for common issues
check_issues() {
    echo "🔍 Checking for common development issues..."
    
    # Check if port 3000 is in use
    if lsof -Pi :3000 -sTCP:LISTEN -t >/dev/null ; then
        echo "⚠️  Port 3000 is in use. Consider killing existing processes."
        echo "   Run: lsof -ti:3000 | xargs kill -9"
    else
        echo "✅ Port 3000 is available"
    fi
    
    # Check for large node_modules
    if [ -d "node_modules" ]; then
        size=$(du -sh node_modules | cut -f1)
        echo "📦 node_modules size: $size"
        if [[ $size == *"M"* ]] && [[ ${size%M} -gt 200 ]]; then
            echo "⚠️  Large node_modules detected. Consider running 'npm prune'"
        fi
    fi
    
    # Check for .next directory
    if [ -d ".next" ]; then
        size=$(du -sh .next | cut -f1)
        echo "🏗️  .next build size: $size"
    fi
}

# Function to optimize dependencies
optimize_deps() {
    echo "⚡ Optimizing dependencies..."
    
    # Remove unused dependencies
    echo "🧹 Running npm prune..."
    npm prune
    
    # Clear npm cache
    echo "🧹 Clearing npm cache..."
    npm cache clean --force
    
    echo "✅ Dependencies optimized!"
}

# Function to show development tips
show_tips() {
    echo "💡 Development Tips:"
    echo "===================="
    echo "• Use 'npm run dev' for development with Turbopack"
    echo "• Press 'r' in terminal to restart the dev server"
    echo "• Use browser dev tools to monitor performance"
    echo "• Check Network tab for slow API calls"
    echo "• Use React DevTools for component debugging"
    echo "• Clear browser cache if you see stale data"
    echo ""
    echo "🔧 Performance Optimizations Applied:"
    echo "• Next.js Turbopack enabled"
    echo "• Bundle splitting optimized"
    echo "• API response caching"
    echo "• Error boundaries added"
    echo "• Auth context optimized"
    echo "• Console logs removed in production"
}

# Main menu
case "${1:-menu}" in
    "clean")
        clean_cache
        ;;
    "restart")
        restart_dev
        ;;
    "check")
        check_issues
        ;;
    "optimize")
        optimize_deps
        ;;
    "tips")
        show_tips
        ;;
    "menu"|*)
        echo "Available commands:"
        echo "  ./dev-optimize.sh clean     - Clean build cache"
        echo "  ./dev-optimize.sh restart   - Restart dev server with optimizations"
        echo "  ./dev-optimize.sh check     - Check for common issues"
        echo "  ./dev-optimize.sh optimize  - Optimize dependencies"
        echo "  ./dev-optimize.sh tips      - Show development tips"
        echo ""
        echo "Quick start: ./dev-optimize.sh restart"
        ;;
esac
