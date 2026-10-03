; MultiOs — ISR/IRQ stubs. Original code, NASM syntax.
; 32 CPU exceptions (with/without error codes) + 16 IRQs remapped at 0x20.
; Each stub pushes vector number + dummy/error, then jumps to common handler.
; Handlers implemented in kernel/cpu/idt.c: isr_handler / irq_handler.

global isr_stub_table
global irq_stub_table
extern isr_handler
extern irq_handler

section .text
bits 64

; common ISR entry: stack = [rip,cs,rflags(,rsp,ss if ring change), vec, err]
isr_common:
    ; save caller-saved + segment state
    push rax
    push rcx
    push rdx
    push rbx
    push rbp
    push rsi
    push rdi
    push r8
    push r9
    push r10
    push r11
    push r12
    push r13
    push r14
    push r15
    mov rdi, rsp                ; pass register frame pointer
    call isr_handler
    pop r15
    pop r14
    pop r13
    pop r12
    pop r11
    pop r10
    pop r9
    pop r8
    pop rdi
    pop rsi
    pop rbp
    pop rbx
    pop rdx
    pop rcx
    pop rax
    add rsp, 16                 ; drop vec + err code
    iretq

irq_common:
    push rax
    push rcx
    push rdx
    push rbx
    push rbp
    push rsi
    push rdi
    push r8
    push r9
    push r10
    push r11
    push r12
    push r13
    push r14
    push r15
    mov rdi, rsp
    call irq_handler
    pop r15
    pop r14
    pop r13
    pop r12
    pop r11
    pop r10
    pop r9
    pop r8
    pop rdi
    pop rsi
    pop rbp
    pop rbx
    pop rdx
    pop rcx
    pop rax
    add rsp, 16
    iretq

%macro ISR_NOERR 1
global isr_stub_%1
isr_stub_%1:
    push qword 0                ; dummy error code
    push qword %1               ; vector
    jmp isr_common
%endmacro

%macro ISR_ERR 1
global isr_stub_%1
isr_stub_%1:
    ; cpu already pushed error code; push vector (stack has err on top,
    ; we need order vec,err? we push vec so layout = vec,err for handler)
    push qword %1
    jmp isr_common
%endmacro

; NOTE: for error-code vectors the stack on entry is [err, rip, ...].
; Our common frame expects [vec, err, rip...]? To keep the handler simple
; we normalize: ISR_ERR pushes vec, so stack top = vec, then err.
; isr_common drops 16 bytes (both). Handler reads them accordingly.
; ISR_NOERR pushes err=0 then vec, same layout. Consistent.

ISR_NOERR 0
ISR_NOERR 1
ISR_NOERR 2
ISR_NOERR 3
ISR_NOERR 4
ISR_NOERR 5
ISR_NOERR 6
ISR_NOERR 7
ISR_ERR   8
ISR_NOERR 9
ISR_ERR   10
ISR_ERR   11
ISR_ERR   12
ISR_ERR   13
ISR_ERR   14
ISR_NOERR 15
ISR_NOERR 16
ISR_ERR   17
ISR_NOERR 18
ISR_NOERR 19
ISR_NOERR 20
ISR_NOERR 21
ISR_NOERR 22
ISR_NOERR 23
ISR_NOERR 24
ISR_NOERR 25
ISR_NOERR 26
ISR_NOERR 27
ISR_NOERR 28
ISR_NOERR 29
ISR_ERR   30
ISR_NOERR 31

%macro IRQ_STUB 2
global irq_stub_%1
irq_stub_%1:
    push qword 0
    push qword %2
    jmp irq_common
%endmacro

IRQ_STUB 0, 32
IRQ_STUB 1, 33
IRQ_STUB 2, 34
IRQ_STUB 3, 35
IRQ_STUB 4, 36
IRQ_STUB 5, 37
IRQ_STUB 6, 38
IRQ_STUB 7, 39
IRQ_STUB 8, 40
IRQ_STUB 9, 41
IRQ_STUB 10, 42
IRQ_STUB 11, 43
IRQ_STUB 12, 44
IRQ_STUB 13, 45
IRQ_STUB 14, 46
IRQ_STUB 15, 47

section .rodata
align 8
isr_stub_table:
%assign i 0
%rep 32
    dq isr_stub_%+i
%assign i i+1
%endrep

irq_stub_table:
%assign j 0
%rep 16
    dq irq_stub_%+j
%assign j j+1
%endrep
