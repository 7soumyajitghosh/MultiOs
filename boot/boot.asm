; MultiOs prismkernel — Multiboot2 bootstrap + long-mode trampoline.
; Original code for the MultiOs hobby OS. x86_64, NASM syntax.
; Assembled with: nasm -f elf64 boot/boot.asm
;
; Flow: GRUB (Multiboot2) -> _start (32-bit protected mode) ->
;   checks -> 1 GiB identity paging (2 MiB pages) -> EFER.LME -> GDT64 ->
;   long_mode_start (64-bit) -> kmain(magic, info_addr).

global _start
global long_mode_start
extern kmain

section .multiboot
align 8
; ---- Multiboot2 header (must be within first 32 KiB) ----
mb2_start:
    dd 0xE85250D6              ; magic
    dd 0                       ; arch: 0 = i386 protected mode
    dd mb2_end - mb2_start      ; header length
    dd -(0xE85250D6 + 0 + (mb2_end - mb2_start)) ; checksum

    ; information-request tag: ask for basic meminfo, mmap, framebuffer
    align 8
    dw 1                       ; type = information request
    dw 0                       ; flags
    dd 24                      ; size
    dd 4                       ; tag 4  = basic meminfo
    dd 6                       ; tag 6  = memory map
    dd 8                       ; tag 8  = framebuffer
    dd 0                       ; padding to 8-byte boundary? size 24 covers it

    ; framebuffer tag: prefer 1024x768x32 text-safe request (optional)
    align 8
    dw 5                       ; type = framebuffer
    dw 1                       ; flags: optional
    dd 20                      ; size
    dd 1024                    ; width
    dd 768                     ; height
    dd 32                      ; depth

    align 8
    dw 0                       ; type = end
    dw 0
    dd 8
mb2_end:

section .bss
align 4096
p4_table:  resb 4096
p3_table:  resb 4096
p2_table:  resb 4096
align 16
stack_bottom: resb 16384
stack_top:

section .text
bits 32
_start:
    cli
    mov esp, stack_top

    ; preserve multiboot magic (eax) and info pointer (ebx) in callee-saved regs
    mov edi, eax
    mov esi, ebx

    call check_multiboot
    call check_cpuid
    call check_long_mode

    call setup_page_tables
    call enable_paging

    lgdt [gdt64_ptr]
    ; far jump to 64-bit code segment (selector 0x08)
    jmp 0x08:long_mode_start

    ; should never return here
    hlt

; ---- error reporting: AL = error code char, VGA red-on-black at top-left ----
error:
    mov dword [0xB8000], 0x4F524F45  ; "ER"
    mov dword [0xB8004], 0x4F3A4F52  ; "R:"
    mov dword [0xB8008], 0x4F204F20  ; "  "
    mov byte  [0xB8008], al
    hlt
    jmp error

check_multiboot:
    cmp edi, 0x36D76289
    jne .no_mb
    ret
.no_mb:
    mov al, 'M'
    jmp error

check_cpuid:
    pushfd
    pop eax
    mov ecx, eax
    xor eax, 1 << 21
    push eax
    popfd
    pushfd
    pop eax
    push ecx
    popfd
    cmp eax, ecx
    je .no_cpuid
    ret
.no_cpuid:
    mov al, 'C'
    jmp error

check_long_mode:
    mov eax, 0x80000000
    cpuid
    cmp eax, 0x80000001
    jb .no_long
    mov eax, 0x80000001
    cpuid
    test edx, 1 << 29
    jz .no_long
    ret
.no_long:
    mov al, 'L'
    jmp error

setup_page_tables:
    ; p4[0] -> p3, p3[0] -> p2
    mov eax, p3_table
    or eax, 0b11               ; present + writable
    mov [p4_table], eax

    mov eax, p2_table
    or eax, 0b11
    mov [p3_table], eax

    ; each p2 entry maps a 2 MiB huge page: phys = i * 2 MiB
    xor ecx, ecx
.map_p2:
    mov eax, ecx
    shl eax, 21                ; eax = ecx * 2 MiB
    or eax, 0b10000011         ; present + writable + huge
    mov [p2_table + ecx*8], eax
    inc ecx
    cmp ecx, 512
    jne .map_p2
    ret

enable_paging:
    ; point CR3 at PML4
    mov eax, p4_table
    mov cr3, eax

    ; enable PAE (CR4 bit 5)
    mov eax, cr4
    or eax, 1 << 5
    mov cr4, eax

    ; set Long Mode Enable in EFER (MSR 0xC0000080, bit 8)
    mov ecx, 0xC0000080
    rdmsr
    or eax, 1 << 8
    wrmsr

    ; enable SSE: CR0.EM=0, CR0.MP=1; CR4.OSFXSR=1, CR4.OSXMMEXCPT=1
    mov eax, cr0
    and eax, ~(1 << 2)
    or eax, 1 << 1
    mov cr0, eax
    mov eax, cr4
    or eax, (1 << 9) | (1 << 10)
    mov cr4, eax

    ; enable paging + write-protect (CR0.PG bit 31, CR0.WP bit 16)
    mov eax, cr0
    or eax, (1 << 31) | (1 << 16)
    mov cr0, eax
    ret

section .rodata
align 8
gdt64:
    dq 0                        ; 0x00 null
    dq 0x00209A0000000000       ; 0x08 64-bit code: exec/read, long mode
    dq 0x0000920000000000       ; 0x10 64-bit data: read/write
gdt64_ptr:
    dw gdt64_ptr - gdt64 - 1
    dq gdt64

section .text
bits 64
long_mode_start:
    cli
    mov ax, 0x10
    mov ds, ax
    mov es, ax
    mov fs, ax
    mov gs, ax
    mov ss, ax

    mov rsp, stack_top

    ; rdi = magic (zero-extended), rsi = info addr (zero-extended)
    mov edi, edi
    mov esi, esi
    ; note: edi/esi already hold the 32-bit values from _start; the
    ; `mov reg, reg32` above zero-extends into rdi/rsi explicitly.

    call kmain

.hang:
    hlt
    jmp .hang
