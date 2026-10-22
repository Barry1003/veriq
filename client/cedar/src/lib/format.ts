export const naira = (minor: number) => new Intl.NumberFormat("en-NG", {
    style: "currency", currency: "NGN", minimumFractionDigits: 2, maximumFractionDigits: 2,
}).format(minor / 100);
export const dateLabel = (date: string | null | undefined) => {
    if (!date || Number.isNaN(Date.parse(date)))
        return "Not recorded";
    return new Intl.DateTimeFormat("en-NG", { dateStyle: "medium", timeStyle: "short", timeZone: "Africa/Lagos" }).format(new Date(date));
};

