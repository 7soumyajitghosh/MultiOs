#ifndef MOS_IDT_H
#define MOS_IDT_H

#include "types.h"

struct intr_frame {
    u64 r15, r14, r13, r12, r11, r10, r9, r8;
    u64 rdi, rsi, rbp, rbx, rdx, rcx, rax;
    u64 vec;
    u64 err;
    u64 rip, cs, rflags;
    u64 rsp, ss; /* only when ring change; may be absent — read carefully */
};

void idt_init(void);
void idt_set_gate(int vec, u64 handler, u8 type_attr);

#endif
