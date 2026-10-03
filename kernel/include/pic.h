#ifndef MOS_PIC_H
#define MOS_PIC_H

/* 8259 PIC. pic_remap/pic_eoi/pic_set_mask are canonical;
 * pic_init/pic_send_eoi/pic_mask/pic_unmask are compat aliases. */
void pic_remap(void);
void pic_eoi(int irq);
void pic_set_mask(int irq, int masked);

void pic_init(void);
void pic_send_eoi(int irq);
void pic_mask(int irq);
void pic_unmask(int irq);

#endif
