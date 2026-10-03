/* MultiOs prismkernel - 8259 PIC remap. Original code.
 * Master 0x20/0x21, slave 0xA0/0xA1, remapped to 0x20-0x2F.
 */
#include "pic.h"
#include "ports.h"

#define PIC1_CMD  0x20
#define PIC1_DATA 0x21
#define PIC2_CMD  0xA0
#define PIC2_DATA 0xA1

void pic_remap(void) {
    outb(PIC1_CMD, 0x11); io_wait();
    outb(PIC2_CMD, 0x11); io_wait();
    outb(PIC1_DATA, 0x20); io_wait();
    outb(PIC2_DATA, 0x28); io_wait();
    outb(PIC1_DATA, 0x04); io_wait();
    outb(PIC2_DATA, 0x02); io_wait();
    outb(PIC1_DATA, 0x01); io_wait();
    outb(PIC2_DATA, 0x01); io_wait();

    /* Keep timer (IRQ0) + keyboard (IRQ1) unmasked, mask the rest. */
    outb(PIC1_DATA, 0xFC);
    outb(PIC2_DATA, 0xFF);
}

void pic_eoi(int irq) {
    if (irq >= 8) {
        outb(PIC2_CMD, 0x20);
    }
    outb(PIC1_CMD, 0x20);
}

void pic_set_mask(int irq, int masked) {
    u16 port = (irq < 8) ? (u16)PIC1_DATA : (u16)PIC2_DATA;
    int bit = (irq < 8) ? irq : (irq - 8);
    u8 v = inb(port);
    if (masked) {
        v |= (u8)(1u << bit);
    } else {
        v &= (u8)~(1u << bit);
    }
    outb(port, v);
}

void pic_remap_offs(int off1, int off2) { (void)off1; (void)off2; pic_remap(); }
void pic_init(void) { pic_remap(); }
void pic_send_eoi(int irq) { pic_eoi(irq); }
void pic_mask(int irq) { pic_set_mask(irq, 1); }
void pic_unmask(int irq) { pic_set_mask(irq, 0); }
void pic_disable(void) { outb(0x21, 0xFF); outb(0xA1, 0xFF); }
