#!/usr/bin/env bash
set -u
cd /mnt/d/Project/MultiOs
pwd
ls -lh *.iso build/ 2>&1 || true
echo "---TOOLS---"
for t in gcc nasm ld grub-mkrescue grub-file qemu-system-x86_64 xorriso mtools python3 make; do
  if command -v "$t" >/dev/null 2>&1; then
    echo "ok: $t"
  else
    echo "missing: $t"
  fi
done
echo "---GRUB CFG iso/---"
cat iso/boot/grub/grub.cfg || true
echo "---GRUB CFG isodir/---"
cat isodir/boot/grub/grub.cfg || true
echo "---ELF CHECK---"
ls -lh build/*.elf 2>&1 || true
file build/*.elf 2>&1 || true
