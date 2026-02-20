ifeq ($(OS),Windows_NT)
	OS_NAME := Windows
	POWERSHELL := powershell.exe
else
	OS_NAME := Unix
	POWERSHELL := $(shell command -v powershell 2>/dev/null || command -v pwsh 2>/dev/null)
endif

DIST_DIR := dist
APP_NAME := Exchange_Airdrop_Analyzer

.PHONY: help install dev lint test build-mac build-linux build-win clean

help:
	@echo "Targets:"
	@echo "  install     - install npm dependencies"
	@echo "  dev         - run desktop app in development mode"
	@echo "  lint        - run eslint"
	@echo "  test        - run vitest"
	@echo "  build-mac   - build macOS app and zip artifact"
	@echo "  build-linux - build Linux AppImage artifact"
	@echo "  build-win   - build Windows portable zip (.exe)"
	@echo "  clean       - remove generated artifacts"

install:
	npm install

dev: install
	npm run tauri:dev

lint: install
	npm run lint

test: install
	npm run test

build-mac:
	bash scripts/build_tauri_macos.sh

build-linux:
	bash scripts/build_tauri_linux.sh

build-win:
ifeq ($(OS),Windows_NT)
	$(POWERSHELL) -ExecutionPolicy Bypass -File scripts/build_tauri_windows.ps1
else
	@echo "build-win precisa ser executado no Windows."
	@exit 1
endif

clean:
	rm -rf $(DIST_DIR) src-tauri/target
