/*
*This is auto generated from the ControlManifest.Input.xml file
*/

// Define IInputs and IOutputs Type. They should match with ControlManifest.
export interface IInputs {
    fiscalYearStartMonth: ComponentFramework.PropertyTypes.WholeNumberProperty;
    fiscalYearStartDay: ComponentFramework.PropertyTypes.WholeNumberProperty;
    revenueField: ComponentFramework.PropertyTypes.StringProperty;
    closeDateField: ComponentFramework.PropertyTypes.StringProperty;
    statusField: ComponentFramework.PropertyTypes.StringProperty;
    wonStatusValue: ComponentFramework.PropertyTypes.WholeNumberProperty;
    opportunities: ComponentFramework.PropertyTypes.DataSet;
}
export interface IOutputs {
}
