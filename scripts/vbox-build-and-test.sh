#!/usr/bin/env bash
# Deterministic build + QEMU boot smoke test for MultiOs -> VirtualBox.
# Usage: bash scripts/vbox-build-and-test.sh [--keep-iso]
set -euo pipefail
cd "$(dirname "$0")/.."
ROOT="$PWD"

echo "=== 1. clean build artifacts (build/, isodir/) ==="
rm -rf build isodir
mkdir -p build isodir/boot/grub

echo
echo "=== 2. assemble boot/*.asm ==="
OBJS=""
for a in boot/boot.asm boot/isr_stubs.asm; do
    mkdir -p "build/$(dirname "$a")"
    nasm -f elf64 -g -F dwarf "$a" -o "build/${a%.asm}.o"
    echo "  nasm $a -> build/${a%.asm}.o"
    OBJS="$OBJS build/${a%.asm}.o"
done

echo
echo "=== 3. compile kernel C sources ==="
CF="-std=c11 -ffreestanding -nostdlib -fno-builtin -fno-stack-protector \
    -mno-red-zone -m64 -Wall -Wextra -Werror -O2 -I kernel/include -g"
while IFS= read -r c; do
    o="build/${c%.c}.o"
    mkdir -p "$(dirname "$o")"
    # shellcheck disable=SC2086
    cc $CF -c "$c" -o "$o"
    echo "  cc $c -> $o"
    OBJS="$OBJS $o"
done < <(find kernel -name '*.c' | sort)
echo
echo "=== 4. link ./build/myos.elf ==="
# shellcheck disable=SC2086
ld -n -T arch/x86_64/link.ld -o build/myos.elf $OBJS
echo "  ld -> build/myos.elf"

echo
echo "=== 5. validate Multiboot2 ==="
grub-file --is-x86-multiboot2 build/myos.elf && echo "  grub-file --is-x86-multiboot2: PASS"
file   build/myos.elf | sed 's/^/  /'
readelf -h build/myos.elf | grep -E 'Machine|Entry point' | sed 's/^/  /'
readelf -S build/myos.elf | grep -E 'multiboot|\.text|\.rodata|\.data|\.bss' | sed 's/^/  /'

echo
echo "=== 6. stage isodir/ ==="
cp build/myos.elf  isodir/boot/myos.elf
cp boot/grub.cfg   isodir/boot/grub/grub.cfg
find isodir -type f | sort | sed 's/^/  /'

echo
echo "=== 7. grub-mkrescue -> myos-virtualbox.iso ==="
# xorriso cannot always write directly onto a Windows drvfs mount from WSL,
# so build in a native tmpfs first and then copy the finished image over.
TMPISO="$(mktemp -d)/myos-virtualbox.iso"
grub-mkrescue -o "$TMPISO" isodir
cp "$TMPISO" ./myos-virtualbox.iso
ls -lh ./myos-virtualbox.iso | sed 's/^/  /'

echo
echo "=== 8. boot smoke test in QEMU (serial, 8s) ==="
timeout 8 qemu-system-x86_64 \
    -cdrom ./myos-virtualbox.iso \
    -serial stdio -display none -m 512M \
    -no-reboot 2>&1 | sed 's/^/  /' || true
echo "  (qemu exited; empty serial output means no kernel banner reached COM1)"

echo
echo "=== done ==="
