# MultiOs — top-level Makefile (VirtualBox / Multiboot2 x86_64).
# Preserves original prismkernel logic; adds VirtualBox-required outputs:
#   ./build/myos.elf + ./isodir/ + ./myos-virtualbox.iso
# Original outputs (build/prismkernel.elf, build/multios.iso) kept as
# compatibility copies via `make legacy-iso`.
#
# Usage:
#   make all        - build kernel ELF + VirtualBox ISO
#   make kernel     - build ./build/myos.elf only
#   make iso        - build ./myos-virtualbox.iso (validates Multiboot2)
#   make run        - run ISO in QEMU (VGA + serial to stdio)
#   make run-serial - run with serial only on stdio (curses-free log)
#   make debug      - run QEMU paused with GDB stub on :1234 (use gdb remote)
#   make clean      - remove ./build and ./isodir (+ ISO file)
#   make check      - verify host tools
#   make legacy-iso - rebuild original build/multios.iso layout (compat)

CC      ?= gcc
NASM    ?= nasm
LD      ?= ld
GRUB_MKRESCUE ?= grub-mkrescue
GRUB_FILE ?= grub-file
QEMU    ?= qemu-system-x86_64

BUILD   := build
ISODIR  := isodir
KERNEL_ELF := $(BUILD)/myos.elf
ISO     := myos-virtualbox.iso

# Legacy compatibility paths (original project layout, unchanged logic)
LEGACY_ELF := $(BUILD)/prismkernel.elf
LEGACY_ISO_DIR := $(BUILD)/iso
LEGACY_ISO := $(BUILD)/multios.iso

CFLAGS  := -std=c11 -ffreestanding -nostdlib -fno-builtin -fno-stack-protector \
           -mno-red-zone -m64 -Wall -Wextra -Werror -O2 -I kernel/include -g
NASMFLAGS := -f elf64 -g -F dwarf
LDFLAGS := -n -T arch/x86_64/link.ld

C_SRCS := $(shell find kernel -name '*.c')
ASM_SRCS := boot/boot.asm boot/isr_stubs.asm
C_OBJS := $(patsubst %.c,$(BUILD)/%.o,$(C_SRCS))
ASM_OBJS := $(patsubst %.asm,$(BUILD)/%.o,$(ASM_SRCS))
OBJS := $(ASM_OBJS) $(C_OBJS)

.PHONY: all kernel iso run run-serial debug clean check legacy-iso

all: kernel iso

kernel: $(KERNEL_ELF)

$(BUILD)/boot/%.o: boot/%.asm
	@mkdir -p $(dir $@)
	$(NASM) $(NASMFLAGS) $< -o $@

$(BUILD)/kernel/%.o: kernel/%.c
	@mkdir -p $(dir $@)
	$(CC) $(CFLAGS) -c $< -o $@

$(KERNEL_ELF): $(OBJS) arch/x86_64/link.ld
	@mkdir -p $(dir $@)
	$(LD) $(LDFLAGS) -o $@ $(OBJS)
	@cp $@ $(LEGACY_ELF)
	@echo "kernel: $@ (legacy copy: $(LEGACY_ELF))"

$(ISO): $(KERNEL_ELF)
	@mkdir -p $(ISODIR)/boot/grub
	cp $(KERNEL_ELF) $(ISODIR)/boot/myos.elf
	printf 'set timeout=0\nset default=0\n\nmenuentry "My Custom OS" {\n    multiboot2 /boot/myos.elf\n    boot\n}\n' > $(ISODIR)/boot/grub/grub.cfg
	$(GRUB_FILE) --is-x86-multiboot2 $(KERNEL_ELF) && echo "multiboot2: OK $(KERNEL_ELF)"
	$(GRUB_MKRESCUE) -o $@ $(ISODIR)
	@echo "iso: $@"

iso: $(ISO)

run: $(ISO)
	$(QEMU) -cdrom $(ISO) -serial stdio -m 512M

run-serial: $(ISO)
	$(QEMU) -cdrom $(ISO) -serial stdio -display none -m 512M

debug: $(ISO)
	@echo "Starting QEMU paused with GDB stub on :1234..."
	@echo "In another terminal: gdb ./build/myos.elf -ex 'target remote :1234' -ex 'break kmain' -ex 'continue'"
	$(QEMU) -cdrom $(ISO) -serial stdio -m 512M -s -S

legacy-iso: $(KERNEL_ELF) iso/boot/grub/grub.cfg
	@mkdir -p $(LEGACY_ISO_DIR)/boot/grub
	cp $(KERNEL_ELF) $(LEGACY_ISO_DIR)/boot/prismkernel.elf
	cp $(KERNEL_ELF) $(LEGACY_ISO_DIR)/boot/multios.kernel
	cp iso/boot/grub/grub.cfg $(LEGACY_ISO_DIR)/boot/grub/grub.cfg
	$(GRUB_MKRESCUE) -o $(LEGACY_ISO) $(LEGACY_ISO_DIR)
	@echo "legacy iso: $(LEGACY_ISO)"

clean:
	rm -rf $(BUILD) $(ISODIR)
	rm -f $(ISO)

check:
	bash scripts/check.sh
