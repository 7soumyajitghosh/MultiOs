/* MultiOs prismkernel - kmain init order + banner + shell loop. Original code. */
#include "types.h"
#include "multiboot2.h"
#include "vga.h"
#include "serial.h"
#include "kprint.h"
#include "ports.h"
#include "gdt.h"
#include "idt.h"
#include "pic.h"
#include "pit.h"
#include "pmm.h"
#include "heap.h"
#include "keyboard.h"
#include "shell.h"

struct mos_bootinfo g_bootinfo;

void kmain(u32 magic, u32 info_addr) {
    serial_init();
    vga_init();

    vga_set_color(VGA_LIGHT_CYAN, VGA_BLACK);
    kprintf("MultiOs 0.1.0 \"Prism\" -- prismkernel\n");
    vga_set_color(VGA_LIGHT_GREY, VGA_BLACK);

    if (magic != MULTIBOOT2_MAGIC) {
        panic("bad multiboot2 magic");
    }

    mb2_parse(info_addr, &g_bootinfo);

    gdt_init();
    idt_init();
    pic_remap();
    pit_init(100);
    keyboard_init();
    pmm_init(&g_bootinfo);
    heap_init();

    sti();

    shell_run();

    for (;;) {
        hlt();
    }
}
