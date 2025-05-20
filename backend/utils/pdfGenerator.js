const PdfPrinter = require('pdfmake');
const fs = require('fs'); // Not strictly needed if streaming, but good for font definition
const path = require('path');

// Define font files. pdfmake requires these to be explicitly defined.
// You might need to download these font files (e.g., from Google Fonts) and place them in your project.
// For simplicity, pdfmake has some built-in fonts like Roboto, but for more control, define them.
const fonts = {
    Roboto: {
        normal: path.join(__dirname, '..', 'assets', 'fonts', 'Roboto-Regular.ttf'), // Adjust path
        bold: path.join(__dirname, '..', 'assets', 'fonts', 'Roboto-Medium.ttf'),
        italics: path.join(__dirname, '..', 'assets', 'fonts', 'Roboto-Italic.ttf'),
        bolditalics: path.join(__dirname, '..', 'assets', 'fonts', 'Roboto-MediumItalic.ttf'),
    },
    // Add other fonts if needed
};

const printer = new PdfPrinter(fonts);

/**
 * Generates a parking ticket PDF buffer.
 * @param {object} ticketData - Data for the ticket.
 * @param {object} ticketData.user - { name, email }
 * @param {object} ticketData.vehicle - { plate_number, vehicle_type, size }
 * @param {object} ticketData.parkingSlot - { slot_number, location, cost_per_hour }
 * @param {object} ticketData.slotRequest - { id (for ticket number), expected_duration_hours, calculated_cost, requested_at, resolved_at }
 * @param {string} ticketData.appName - Your application name (e.g., "ParkWell Systems")
 * @returns {Promise<Buffer>} - A promise that resolves with the PDF buffer.
 */
const generateParkingTicketPdf = async (ticketData) => {
    return new Promise((resolve, reject) => {
        const { user, vehicle, parkingSlot, slotRequest, appName = "ParkWell Systems" } = ticketData;

        const requestDate = slotRequest.requested_at ? new Date(slotRequest.requested_at).toLocaleString() : 'N/A';
        const approvalDate = slotRequest.resolved_at ? new Date(slotRequest.resolved_at).toLocaleString() : 'N/A';
        const ticketNumber = slotRequest.id.substring(0, 8).toUpperCase(); // Use part of UUID as ticket number

        const documentDefinition = {
            content: [
                { text: appName, style: 'header', alignment: 'center' },
                { text: 'Parking Ticket / Receipt', style: 'subheader', alignment: 'center', margin: [0, 0, 0, 20] },

                { text: `Ticket Number: ${ticketNumber}`, style: 'infoBold' },
                { text: `Approval Date: ${approvalDate}`, style: 'info', margin: [0, 0, 0, 15] },

                { text: 'User Details', style: 'sectionHeader' },
                {
                    table: {
                        widths: ['auto', '*'],
                        body: [
                            [{ text: 'Name:', style: 'tableLabel' }, user.name || 'N/A'],
                            [{ text: 'Email:', style: 'tableLabel' }, user.email || 'N/A'],
                        ],
                    },
                    layout: 'noBorders',
                    margin: [0, 5, 0, 15],
                },

                { text: 'Vehicle Details', style: 'sectionHeader' },
                {
                    table: {
                        widths: ['auto', '*'],
                        body: [
                            [{ text: 'Plate Number:', style: 'tableLabel' }, vehicle.plate_number || 'N/A'],
                            [{ text: 'Type:', style: 'tableLabel' }, vehicle.vehicle_type || 'N/A'],
                            [{ text: 'Size:', style: 'tableLabel' }, vehicle.size || 'N/A'],
                        ],
                    },
                    layout: 'noBorders',
                    margin: [0, 5, 0, 15],
                },

                { text: 'Assigned Slot Details', style: 'sectionHeader' },
                {
                    table: {
                        widths: ['auto', '*'],
                        body: [
                            [{ text: 'Slot Number:', style: 'tableLabel' }, parkingSlot.slot_number || 'N/A'],
                            [{ text: 'Location:', style: 'tableLabel' }, parkingSlot.location || 'N/A'],
                        ],
                    },
                    layout: 'noBorders',
                    margin: [0, 5, 0, 15],
                },

                { text: 'Booking Details', style: 'sectionHeader' },
                {
                    table: {
                        widths: ['auto', '*'],
                        body: [
                            [{ text: 'Expected Duration:', style: 'tableLabel' }, `${slotRequest.expected_duration_hours || 'N/A'} hours`],
                            [{ text: 'Cost per Hour:', style: 'tableLabel' }, parkingSlot.cost_per_hour ? `$${parseFloat(parkingSlot.cost_per_hour).toFixed(2)}` : 'Free'],
                            [{ text: 'Total Calculated Cost:', style: 'tableLabelBold' }, slotRequest.calculated_cost ? `$${parseFloat(slotRequest.calculated_cost).toFixed(2)}` : 'N/A'],
                        ],
                    },
                    layout: 'noBorders',
                    margin: [0, 5, 0, 20],
                },

                { text: 'Thank you for using ParkWell Systems!', style: 'footer', alignment: 'center', margin: [0, 20, 0, 0] },
                { text: 'Please keep this ticket for your records. Valid for the specified duration.', style: 'finePrint', alignment: 'center' },
            ],
            styles: {
                header: { fontSize: 24, bold: true, margin: [0, 0, 0, 5], color: '#2C3340' /* --theme-text-primary approx */ },
                subheader: { fontSize: 16, bold: false, margin: [0, 0, 0, 15], color: '#596070' /* --theme-text-secondary approx */ },
                sectionHeader: { fontSize: 14, bold: true, margin: [0, 10, 0, 5], color: '#2C3340' },
                info: { fontSize: 10, margin: [0, 0, 0, 3], color: '#596070' },
                infoBold: { fontSize: 10, bold: true, margin: [0, 0, 0, 3], color: '#2C3340' },
                tableLabel: { bold: false, color: '#596070', margin: [0, 0, 5, 0] },
                tableLabelBold: { bold: true, color: '#2C3340', margin: [0, 0, 5, 0] },
                footer: { fontSize: 10, italics: true, color: '#596070' },
                finePrint: { fontSize: 8, color: '#8C919E' /* --theme-text-placeholder approx */, margin: [0, 5, 0, 0] }
            },
            defaultStyle: {
                font: 'Roboto', // Use the font defined above
                fontSize: 10,
                lineHeight: 1.3,
            },
        };

        try {
            const pdfDoc = printer.createPdfKitDocument(documentDefinition);
            const chunks = [];
            pdfDoc.on('data', (chunk) => chunks.push(chunk));
            pdfDoc.on('end', () => resolve(Buffer.concat(chunks)));
            pdfDoc.on('error', (err) => reject(err));
            pdfDoc.end();
        } catch (error) {
            reject(error);
        }
    });
};

module.exports = { generateParkingTicketPdf };