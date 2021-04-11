import React from 'react';
import './uploadCsvComponent.css';
import { FileUploaderComponent } from '../fileUploaderComponent/fileUploaderComponent';
import { Button, Spinner } from 'react-bootstrap';
import { createErrorMessage, ToastFunctionProperties, ToastInterface, ToastType } from '../../models/toastInterfaces';
import { EmailService } from '../../services/emailService';
import { SpinnerComponent, SpinnerState } from '../spinnerComponent/spinnerComponent';
import { IBatchSendParameters, IBatchSendResponse, IEmailParameters } from '../../models/emailInterfaces';
import { isIErrorReturnResponse } from '../../models/iError';

interface UploadCsvState extends SpinnerState {
    dragging: boolean;
    file: File | null;
    emailParams: IEmailParameters[];
    isEmailLoading: boolean;
}

interface UploadCsvProperties extends ToastFunctionProperties {
    templateId: string;
    apiKey: string;
    requiredFieldNames: string[];
    fileType: string;
}

export class UploadCsvComponent extends React.Component<UploadCsvProperties, UploadCsvState> {
    private _dragEventCounter = 0;
    private _addToast: (t: ToastInterface) => void;
    private _emailService: EmailService = new EmailService();

    constructor(props: UploadCsvProperties) {
        super(props);
        this._addToast = props.addToast;

        this.state = {
            dragging: false,
            file: null,
            emailParams: [],
            isLoading: false,
            isEmailLoading: false,
        };
    }

    private _dragEnterListener(event: React.DragEvent<HTMLDivElement>): void {
        this._overrideEventDefaults(event);
        this._dragEventCounter++;
        if (event.dataTransfer.items && event.dataTransfer.items[0]) {
            this.setState({ dragging: true });
        } else if (event.dataTransfer.types && event.dataTransfer.types[0] === 'Files') {
            // This block handles support for IE - if you're not worried about
            // that, you can omit this
            this.setState({ dragging: true });
        }
    }

    private _dragleaveListener(event: React.DragEvent<HTMLDivElement>): void {
        this._overrideEventDefaults(event);
        this._dragEventCounter--;

        if (this._dragEventCounter === 0) {
            this.setState({ dragging: false });
        }
    }

    private _dropListener(event: React.DragEvent<HTMLDivElement>): void {
        this._overrideEventDefaults(event);
        this._dragEventCounter = 0;
        this.setState({ dragging: false });

        if (event.dataTransfer.files && event.dataTransfer.files[0]) {
            this._handleUploadCsvFile(event.dataTransfer.files[0]);
        }
    }

    private _overrideEventDefaults(event: Event | React.DragEvent<HTMLDivElement>): void {
        event.preventDefault();
        event.stopPropagation();
    }

    private _onFileChanged(event: React.ChangeEvent<HTMLInputElement>): void {
        if (event.target.files && event.target.files[0]) {
            this._handleUploadCsvFile(event.target.files[0]);
            event.currentTarget.value = '';
        }
    }

    private _isEmptyFile(file: any): boolean {
        const isEmpty = !file || file.size === 0;
        if (isEmpty) {
            this._addToast({
                id: 'emptyCsvError',
                body: 'Cannot upload an empty csv',
                type: ToastType.ERROR,
                open: true,
            });
        }
        return isEmpty;
    }

    private _sendDisabled(): boolean {
        return !this.state.emailParams || this.state.emailParams.length === 0;
    }

    private _isValidFileType(fileType: string): boolean {
        return (
            'text/csv' === fileType ||
            'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet' === fileType ||
            'application/vnd.ms-excel' === fileType
        );
    }

    private _createCsvFileTypeErrorToast(file: File): ToastInterface {
        return {
            id: 'wrongFileType',
            body: `Uploaded file [${file.name}] is invalid. Valid file types: [*.csv]`,
            type: ToastType.ERROR,
            open: true,
        };
    }

    private _handleUploadCsvFile(file: File): void {
        if (!this._isEmptyFile(file) && this._isValidFileType(file.type)) {
            this._emailService
                .parseCsv(file)
                .then(([csvData, csvFieldNames]) => {
                    if (this._validateCsv(csvData, csvFieldNames)) {
                        const emailParams: IEmailParameters[] = [];
                        const uniqueParams: Set<string> = new Set();
                        csvData.forEach((row: any) => {
                            const fieldObj: any = {};
                            csvFieldNames.forEach((fieldName: string) => {
                                fieldObj[fieldName.toUpperCase()] = row[fieldName].toString();
                            });
                            const params: IEmailParameters = {
                                subject: row.Subject,
                                recipient: row.Recipient,
                                fields: fieldObj,
                            };
                            const stringified = JSON.stringify(params);
                            if (!uniqueParams.has(stringified)) {
                                uniqueParams.add(stringified);
                                emailParams.push(params);
                            }
                        });
                        this.setState({ file: file, emailParams: emailParams });
                    }
                })
                .catch(err => {
                    this._addToast({
                        id: 'parseCsvError',
                        body: `Could not parse csv file. Error: ${err}`,
                        type: ToastType.ERROR,
                        open: true,
                    });
                });
        } else {
            this._addToast(this._createCsvFileTypeErrorToast(file));
        }
    }

    private _validateCsv(csvData: any[], csvFieldNames: string[]): boolean {
        const templateFieldNamesSet = new Set(this.props.requiredFieldNames);
        const csvFieldNamesSet = new Set(csvFieldNames.map(name => name.toUpperCase()));

        let isValid =
            csvFieldNamesSet.size === templateFieldNamesSet.size &&
            this.props.requiredFieldNames.every(field => csvFieldNamesSet.has(field));

        if (!isValid) {
            this._addToast({
                id: 'fieldNamesMismatchError',
                body: 'Field names in CSV file do not match the ones for the template',
                type: ToastType.ERROR,
                open: true,
            });
            return isValid;
        }

        isValid = csvData.every((row: any) => {
            return row.Subject && row.Recipient && row.Subject !== '' && row.Recipient !== '';
        });
        if (!isValid) {
            this._addToast({
                id: 'missingSubjectOrRecipientError',
                body: 'Some rows are missing Subject or Recipient',
                type: ToastType.ERROR,
                open: true,
            });
            return isValid;
        }

        isValid = csvData.every((row: any) => {
            return EmailService.isEmailValid(row.Recipient);
        });
        if (!isValid) {
            this._addToast({
                id: 'badEmail',
                body: 'Some rows contain invalid Recipient emails',
                type: ToastType.ERROR,
                open: true,
            });
            return isValid;
        }

        isValid = csvData.every((row: any) => csvFieldNames.every((fieldName: string) => row[fieldName] && row[fieldName] !== ''));
        if (!isValid) {
            this._addToast({
                id: 'emptyRequiredField',
                body: 'Some rows are missing dynamic field parameters',
                type: ToastType.ERROR,
                open: true,
            });
            return isValid;
        }

        if (this._hasDuplicateRows(csvData)) {
            this._addToast({
                id: 'csvHasDuplicateRows',
                body: 'CSV contains duplicate rows. Duplicate emails will only be sent once.',
                type: ToastType.WARN,
                open: true,
            });
        }

        return isValid;
    }

    private _hasDuplicateRows(csvData: any[]): boolean {
        const rowSet = new Set<string>();
        for (const row of csvData) {
            if (rowSet.has(JSON.stringify(row))) {
                return true;
            } else {
                rowSet.add(JSON.stringify(row));
            }
        }
        return false;
    }

    private _getSendButtonText(): string {
        if (!this.state.emailParams || this.state.emailParams.length === 0) {
            return 'Send Batch Email';
        } else if (this.state.emailParams.length === 1) {
            return `Send 1 Email`;
        } else {
            return `Send ${this.state.emailParams.length} Emails`;
        }
    }

    private _batchSend(): void {
        this.setState({ isEmailLoading: true }, () => {
            const emailParams = this.state.emailParams;
            const batchEmailParams: IBatchSendParameters = {
                templateId: this.props.templateId,
                apiKey: this.props.apiKey,
                emails: emailParams,
            };
            this._emailService
                .sendBatchEmail(batchEmailParams)
                .then((response: IBatchSendResponse) => {
                    let toast: ToastInterface;
                    if (response.failed === 0) {
                        toast = {
                            id: 'sendBatchEmailSuccess',
                            body: `Successfully processed ${response.processed} emails`,
                            type: ToastType.SUCCESS,
                            open: true,
                        };
                    } else {
                        toast = {
                            id: 'sendBatchEmailError',
                            body: `Failed to process ${response.failed}/${emailParams.length} emails`,
                            type: ToastType.ERROR,
                            open: true,
                        };
                    }
                    this._addToast(toast);
                })
                .catch(err => {
                    let body: string;
                    if (isIErrorReturnResponse(err)) {
                        body = createErrorMessage(err.response.data, `Failed to process batch emails.`);
                    } else {
                        body = `Failed to process batch emails.`;
                    }
                    const toast = {
                        id: 'sendBatchEmailError',
                        body: body,
                        type: ToastType.ERROR,
                        open: true,
                    };
                    this._addToast(toast);
                })
                .finally(() => this.setState({ isEmailLoading: false }));
        });
    }

    componentDidMount(): void {
        window.addEventListener('dragover', (event: Event) => {
            this._overrideEventDefaults(event);
        });
        window.addEventListener('drop', (event: Event) => {
            this._overrideEventDefaults(event);
        });
    }

    componentWillUnmount(): void {
        window.removeEventListener('dragover', this._overrideEventDefaults);
        window.removeEventListener('drop', this._overrideEventDefaults);
    }

    render(): JSX.Element {
        return (
            <div className='upload-modal-container'>
                <h4 className='upload-modal-title'>Upload CSV</h4>
                <div className='upload-modal-body'>
                    <FileUploaderComponent
                        dragging={this.state.dragging}
                        file={this.state.file}
                        fileTypeAcceptance={this.props.fileType}
                        onDrag={this._overrideEventDefaults.bind(this)}
                        onDragStart={this._overrideEventDefaults.bind(this)}
                        onDragEnd={this._overrideEventDefaults.bind(this)}
                        onDragOver={this._overrideEventDefaults.bind(this)}
                        onDragEnter={this._dragEnterListener.bind(this)}
                        onDragLeave={this._dragleaveListener.bind(this)}
                        onDrop={this._dropListener.bind(this)}
                        onFileChanged={this._onFileChanged.bind(this)}
                    />
                    <Button
                        size='lg'
                        variant='outline-dark'
                        className='batch-send-button'
                        onClick={this._batchSend.bind(this)}
                        disabled={this.state.isEmailLoading || this._sendDisabled()}
                    >
                        {!this.state.isEmailLoading && <span>{this._getSendButtonText()}</span>}
                        {this.state.isEmailLoading && <Spinner as='span' animation='border' role='status' aria-hidden='true' />}
                    </Button>
                    {this.state.isLoading && <SpinnerComponent />}
                </div>
            </div>
        );
    }
}
