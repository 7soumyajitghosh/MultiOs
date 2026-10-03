/* MultiOs prismkernel — 64-bit GDT reload. Original code.
 * Descriptors match the bootstrap (null / code / data).
 */
#include "gdt.h"
#include "types.h"

struct gdt_entry {
    u16 limit_lo;
    u16 base_lo;
    u8 base_mid;
    u8 access;
    u8 gran;
    u8 base_hi;
} __attribute__((packed));

struct gdt_ptr {
    u16 limit;
    u64 base;
} __attribute__((packed));

static struct gdt_entry g_gdt[3];
static struct gdt_ptr g_gdtp;

static void gdt_set(int i, u32 base, u32 limit, u8 access, u8 gran) {
    g_gdt[i].limit_lo = (u16)(limit & 0xFFFF);
    g_gdt[i].base_lo = (u16)(base & 0xFFFF);
    g_gdt[i].base_mid = (u8)((base >> 16) & 0xFF);
    g_gdt[i].access = access;
    g_gdt[i].gran = (u8)(((limit >> 16) & 0x0F) | (gran & 0xF0));
    g_gdt[i].base_hi = (u8)((base >> 24) & 0xFF);
}

void gdt_init(void) {
    /* Flat 64-bit segments. Long-mode code uses EFER.LMA, not the
     * legacy granularity bits, but keep sane values for -Werror builds. */
    gdt_set(0, 0, 0, 0, 0);
    /* 0x08 code: present, exec/read, long mode (0x20 L bit via 0xA0 gran nibble) */
    gdt_set(1, 0, 0, 0x9A, 0xA0);
    /* 0x10 data: present, read/write */
    gdt_set(2, 0, 0, 0x92, 0xC0);

    g_gdtp.limit = (u16)(sizeof(g_gdt) - 1);
    g_gdtp.base = (u64)&g_gdt[0];

    __asm__ volatile (
        "lgdt %0\n"
        "mov $0x10, %%ax\n"
        "mov %%ax, %%ds\n"
        "mov %%ax, %%es\n"
        "mov %%ax, %%fs\n"
        "mov %%ax, %%gs\n"
        "mov %%ax, %%ss\n"
        "pushq $0x08\n"
        "leaq 1f(%%rip), %%rax\n"
        "pushq %%rax\n"
        ".byte 0x48, 0xCB\n"   /* retfq */
        "1:\n"
        :
        : "m"(g_gdtp)
        : "rax", "memory");
}
