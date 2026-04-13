# Skill Tree Interaction State Machine

Below is a diagram representing how the application currently regulates interaction via our distinct states. The system relies on a primary string variable (`window.APP_STATE`) and a secondary boolean context modifier (`isMapMode`).

This document uses [Mermaid.js](https://mermaid.js.org/) to render the state machine diagram. Most code editors (like VS Code, via the "Markdown Preview Mermaid Support" extension) and repositories (like GitHub/GitLab) will natively render this graph!

```mermaid
stateDiagram-v2
    [*] --> BROWSING : Initial Load

    state "BROWSING" as Browsing
    note right of Browsing: Auto-rotation and planet hopping

    state "SELECTED" as Selected
    note right of Selected: Free drag rotation

    state "CHILD_NODE_SELECTED" as ChildNode
    note right of ChildNode: Auto-centering node logic

    state "MAP_VIEW" as MapView
    note left of MapView: Orthographic top-down overview

    Browsing --> Selected : Click Node
    Selected --> Browsing : Click Background / Escape
    
    Selected --> ChildNode : Click Child Node
    ChildNode --> Selected : Click Parent Node
    ChildNode --> Browsing : Click Background / Escape
    
    Browsing --> MapView : Scroll Down (isMapMode = true)
    Selected --> MapView : Scroll Down (isMapMode = true)
    ChildNode --> MapView : Scroll Down (isMapMode = true)
    
    MapView --> Browsing : Scroll Up (isMapMode = false)
    MapView --> Selected : Click Node from Map
```
