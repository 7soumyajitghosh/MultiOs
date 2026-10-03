OUTPUT_FORMAT(elf64-x86-64)
OUTPUT_ARCH(i386:x86-64)
ENTRY(_start)

SECTIONS
{
    . = 0x100000;

    _kernel_start = .;

    .multiboot : {
        *(.multiboot)
    }

    .text : AT(ADDR(.text)) {
        *(.text*)
    }

    .rodata : AT(LOADADDR(.rodata)) {
        *(.rodata*)
    }

    .data : AT(LOADADDR(.data)) {
        *(.data*)
    }

    .bss : AT(LOADADDR(.bss)) {
        *(COMMON)
        *(.bss*)
    }

    _kernel_end = .;
}
