/* MultiOs prismkernel — IDT + exception/IRQ dispatch. Original code.
 * 256 gates (interrupt gates 0x8E), stubs from boot/isr_stubs.asm.
 */
#include "idt.h"
#include "kprint.h"
#include "ports.h"
#include "pic.h"
#include "pit.h"
#include "keyboard.h"
#include "string.h"

struct idt_gate {
    u16 off_lo;
    u16 sel;
    u8 ist;
    u8 attr;
    u16 off_mid;
    u32 off_hi;
    u32 zero;
} __attribute__((packed));

struct idt_ptr {
    u16 limit;
    u64 base;
} __attribute__((packed));

extern u64 isr_stub_table[32];
extern u64 irq_stub_table[16];

static struct idt_gate g_idt[256];
static struct idt_ptr g_idtp;

static const char *g_exc_names[32] = {
    "divide by zero", "debug", "NMI", "breakpoint",
    "overflow", "bound range", "invalid opcode", "no FPU",
    "double fault", "coprocessor overrun", "invalid TSS", "segment missing",
    "stack fault", "general protection", "page fault", "reserved(15)",
    "x87 FPU", "alignment", "machine check", "SIMD",
    "virtualization", "control protection", "reserved(22)", "reserved(23)",
    "reserved(24)", "reserved(25)", "reserved(26)", "reserved(27)",
    "hypervisor", "extended security", "reserved(30)", "reserved(31)",
};

static void idt_set_gate_raw(int vec, u64 handler, u8 attr) {
    struct idt_gate *g = &g_idt[vec];
    g->off_lo = (u16)(handler & 0xFFFF);
    g->sel = 0x08;
    g->ist = 0;
    g->attr = attr;
    g->off_mid = (u16)((handler >> 16) & 0xFFFF);
    g->off_hi = (u32)((handler >> 32) & 0xFFFFFFFF);
    g->zero = 0;
}

void idt_init(void) {
    memset(g_idt, 0, sizeof(g_idt));
    for (int i = 0; i < 32; i++) {
        idt_set_gate_raw(i, isr_stub_table[i], 0x8E);
    }
    for (int i = 0; i < 16; i++) {
        idt_set_gate_raw(32 + i, irq_stub_table[i], 0x8E);
    }
    g_idtp.limit = (u16)(sizeof(g_idt) - 1);
    g_idtp.base = (u64)&g_idt[0];
    __asm__ volatile ("lidt %0" : : "m"(g_idtp) : "memory");
}

void isr_handler(struct isr_frame *f) {
    u64 vec = f->vec & 0xFFFFFFFFu;
    const char *name = "unknown";
    if (vec < 32) {
        name = g_exc_names[vec];
    }
    kprintf("\n[isr] fault vec=%llu (%s) err=0x%llx rip=0x%llx\n",
            vec, name, f->err, f->rip);
    if (vec == 3 || vec == 1) {
        return; /* breakpoints/debug: resume */
    }
    panic("CPU exception");
}

void irq_handler(struct isr_frame *f) {
    u64 vec = f->vec & 0xFFFFFFFFu;
    if (vec < 32 || vec >= 48) {
        return;
    }
    int irq = (int)(vec - 32);
    if (irq == 0) {
        pit_tick_handler();
    } else if (irq == 1) {
        keyboard_irq_handler();
    }
    pic_eoi(irq);
}
