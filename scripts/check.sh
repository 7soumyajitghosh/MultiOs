#!/usr/bin/env bash
# MultiOs host tool check (original script).
set -e
missing=0
for tool in gcc nasm ld grub-mkrescue qemu-system-x86_64 xorriso mtools python3; do
  if command -v "$tool" >/dev/null 2>&1; then
    echo "ok: $tool"
  else
    echo "missing: $tool"
    missing=1
  fi
done
if [ "$missing" -ne 0 ]; then
  echo "Install missing tools, e.g.:"
  echo "  sudo apt-get install -y gcc nasm make qemu-system-x86 grub-pc-bin xorriso mtools python3"
  exit 1
fi
echo "all tools present"
