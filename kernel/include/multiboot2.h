#ifndef MOS_MULTIBOOT2_H
#define MOS_MULTIBOOT2_H

#include "types.h"

/* Multiboot2 constants (spec facts). MOS_ prefix is canonical;
 * unprefixed aliases are accepted for convenience. */
#define MOS_MB2_MAGIC 0x36D76289u
#define MULTIBOOT2_MAGIC MOS_MB2_MAGIC

/* Multiboot2 tag types (Multiboot2 specification, "Tag Types" table).
 * 0 end, 1 cmdline, 2 boot loader name, 3 module, 4 basic meminfo,
 * 5 boot device, 6 mmap, 7 framebuffer, 8 ELF sections, ... */
#define MOS_MB2_TAG_END       0
#define MOS_MB2_TAG_CMDLINE   1
#define MOS_MB2_TAG_BOOTLOADER 2
#define MOS_MB2_TAG_MODULE    3
#define MOS_MB2_TAG_MEMINFO   4
#define MOS_MB2_TAG_BOOTDEV   5
#define MOS_MB2_TAG_MMAP      6
#define MOS_MB2_TAG_FB        7
#define MOS_MB2_TAG_ELF       8

#define MB2_TAG_END       MOS_MB2_TAG_END
#define MB2_TAG_CMDLINE   MOS_MB2_TAG_CMDLINE
#define MB2_TAG_BOOTLOADER MOS_MB2_TAG_BOOTLOADER
#define MB2_TAG_MODULE    MOS_MB2_TAG_MODULE
#define MB2_TAG_MEMINFO   MOS_MB2_TAG_MEMINFO
#define MB2_TAG_BOOTDEV   MOS_MB2_TAG_BOOTDEV
#define MB2_TAG_MMAP      MOS_MB2_TAG_MMAP
#define MB2_TAG_FB        MOS_MB2_TAG_FB
#define MB2_TAG_ELF       MOS_MB2_TAG_ELF
#define MB2_TAG_FBINFO    MOS_MB2_TAG_FB

#define MOS_MB2_MMAP_AVAILABLE        1
#define MOS_MB2_MMAP_RESERVED         2
#define MOS_MB2_MMAP_ACPI_RECLAIMABLE 3
#define MOS_MB2_MMAP_NVS              4
#define MOS_MB2_MMAP_BADRAM           5

#define MB2_MMAP_USABLE           MOS_MB2_MMAP_AVAILABLE
#define MB2_MMAP_AVAILABLE        MOS_MB2_MMAP_AVAILABLE
#define MB2_MMAP_RESERVED         MOS_MB2_MMAP_RESERVED
#define MB2_MMAP_ACPI_RECLAIMABLE MOS_MB2_MMAP_ACPI_RECLAIMABLE
#define MB2_MMAP_NVS              MOS_MB2_MMAP_NVS
#define MB2_MMAP_BADRAM           MOS_MB2_MMAP_BADRAM

struct mb2_tag {
    u32 type;
    u32 size;
};

struct mb2_mmap_entry {
    u64 base;
    u64 length;
    u32 type;
    u32 reserved;
};

struct mb2_mmap_tag {
    u32 type;
    u32 size;
    u32 entry_size;
    u32 entry_version;
    struct mb2_mmap_entry entries[];
};

struct mb2_meminfo_tag {
    u32 type;
    u32 size;
    u32 mem_lower;
    u32 mem_upper;
};

/* Parsed summary handed to the rest of the kernel. */
struct mos_bootinfo {
    const char *bootloader;      /* may be NULL */
    u32 mem_lower_kb;
    u32 mem_upper_kb;
    struct mb2_mmap_tag *mmap;   /* may be NULL */
    u64 mmap_bytes;
    /* Extent of the whole Multiboot2 information block. GRUB owns this
     * memory: it is not covered by the memory map, so the PMM must be told
     * to reserve it or it will be handed out to kmalloc and zeroed. */
    u64 info_base;
    u32 info_total;
};

void mb2_parse(u32 info_addr, struct mos_bootinfo *out);

#endif
