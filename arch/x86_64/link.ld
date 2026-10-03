OUTPUT_FORMAT(elf64-x86-64)
OUTPUT_ARCH(i386:x86-64)
ENTRY(_start)

SECTIONS
{
    . = 0x100000;

    _kernel_start = .;

    .multiboot : {
        /* KEEP prevents linker GC from discarding the Multiboot2 header.
           Must stay first in the image so header lands within first 32 KiB. */
        KEEP(*(.multiboot))
    }

    .text : {
        *(.text*)
    }

    .rodata : {
        *(.rodata*)
    }

    .data : {
        *(.data*)
    }

    .bss : {
        *(COMMON)
        *(.bss*)
    }

    _kernel_end = .;
}
