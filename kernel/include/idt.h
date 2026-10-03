#ifndef MOS_IDT_H
#define MOS_IDT_H

#include "types.h"

struct isr_frame {
    u64 r15, r14, r13, r12, r11, r10, r9, r8;
    u64 rdi, rsi, rbp, rbx, rdx, rcx, rax;
    u64 vec;
    u64 err;
    u64 rip;
    u64 cs;
    u64 rflags;
};

void idt_init(void);
void isr_handler(struct isr_frame *f);
void irq_handler(struct isr_frame *f);

#endif
