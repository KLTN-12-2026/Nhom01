import React, { useState } from 'react';
import { IoClose } from 'react-icons/io5';
import Loading from './Loading';
import { Card, CardContent, CardHeader, CardTitle } from './ui/card';
import { Button } from './ui/button';
import GlareHover from './GlareHover';

const ConfirmBox = ({
    cancel,
    confirm,
    close,
    title,
    message,
    confirmText,
    cancelText,
}) => {
    const [confirmLoading, setConfirmLoading] = useState(false);
    const [cancelLoading, setCancelLoading] = useState(false);

    return (
        <section
            onClick={close}
            className="bg-background/80 backdrop-blur-sm z-50 fixed inset-0 overflow-auto
            flex items-center justify-center p-4 transition-all"
        >
            <Card
                onClick={(e) => e.stopPropagation()}
                className="w-full max-w-md mx-auto rounded-2xl shadow-xl border border-border/80 bg-card overflow-hidden"
            >
                <CardHeader className="flex flex-row justify-between items-center gap-4 p-5 sm:p-6 border-b border-border/60">
                    <CardTitle className="font-semibold text-base sm:text-lg text-highlight font-display">
                        {title}
                    </CardTitle>
                    <button
                        onClick={close}
                        className="p-1.5 rounded-lg text-muted-foreground hover:text-foreground hover:bg-muted transition-colors"
                        aria-label="Đóng"
                    >
                        <IoClose size={20} />
                    </button>
                </CardHeader>
                <CardContent className="p-5 sm:p-6 grid gap-6">
                    <p className="text-sm text-foreground/80 leading-relaxed">{message}</p>
                    <div className="flex items-center justify-end gap-3">
                        <Button
                            variant="outline"
                            onClick={async () => {
                                setCancelLoading(true);
                                try {
                                    await Promise.resolve(cancel());
                                } finally {
                                    setCancelLoading(false);
                                }
                            }}
                            disabled={confirmLoading}
                            className="px-4 py-2 rounded-xl text-sm font-medium border-border/80 hover:bg-muted text-foreground"
                        >
                            {cancelLoading ? <Loading /> : cancelText}
                        </Button>

                        <Button
                            onClick={async () => {
                                setConfirmLoading(true);
                                try {
                                    await Promise.resolve(confirm());
                                } finally {
                                    setConfirmLoading(false);
                                }
                            }}
                            disabled={cancelLoading}
                            className="px-5 py-2 rounded-xl text-sm font-medium bg-primary hover:bg-primary/90 text-primary-foreground shadow-xs"
                        >
                            {confirmLoading ? <Loading /> : confirmText}
                        </Button>
                    </div>
                </CardContent>
            </Card>
        </section>
    );
};

export default ConfirmBox;
