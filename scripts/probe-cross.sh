#!/usr/bin/env bash
set -u
for t in x86_64-elf-gcc x86_64-elf-ld x86_64-elf-as x86_64-elf-objcopy file readelf objdump gdb; do
  if command -v "$t" >/dev/null 2>&1; then
    echo "ok: $t"
  else
    echo "missing: $t"
  fi
done
echo "---versions---"
gcc --version | head -n 1 || true
ld --version | head -n 1 || true
nasm -v || true
grub-mkrescue --version | head -n 1 || true
