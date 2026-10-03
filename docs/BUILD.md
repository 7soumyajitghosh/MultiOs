# MultiOs BUILD — how to build / run / troubleshoot

## Prereqs (Linux / WSL Ubuntu)
```sh
sudo apt-get update
sudo apt-get install -y gcc nasm make qemu-system-x86 grub-pc-bin xorriso mtools python3
```

## Build
```sh
make
# outputs build/prismkernel.elf + build/multios.iso
```

## Run
```sh
make run
# VGA + serial to stdio
make run-serial
# serial only, no display (CI-friendly)
qemu-system-x86_64 -cdrom build/multios.iso -serial stdio -display none
```

## Expected output
```
MultiOs 0.1.0 "Prism" — prismkernel
[memory] map parsed ...
[shell] type `help`
multios>
```

## Troubleshooting
- `grub-mkrescue: not found` — install `grub-pc-bin xorriso mtools`.
- `nasm: command not found` — install `nasm`.
- QEMU window empty — check serial output; VGA needs 80x25 text.
- Triple fault on boot — verify Multiboot2 magic `0x36D76289`
  and that GRUB used `multiboot2 /boot/prismkernel.elf`.
- Windows build — use WSL or Docker (see Dockerfile); native
  MinGW gcc is too old and lacks ELF64 multiboot tooling.

## Reproducible build
```sh
docker build -t multios .
docker run --rm -v $PWD/build:/out multios
```
