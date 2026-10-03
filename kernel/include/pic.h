#ifndef MOS_PIC_H
#define MOS_PIC_H

void pic_init(void);
void pic_send_eoi(int irq);
void pic_mask(int irq);
void pic_unmask(int irq);

#endif
