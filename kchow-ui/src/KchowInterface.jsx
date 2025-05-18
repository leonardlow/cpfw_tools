import { useState, useEffect } from "react";
import { Input } from "./components/ui/input";
import { Checkbox } from "./components/ui/checkbox";
import { Button } from "./components/ui/button";
import { Card, CardContent } from "./components/ui/card";

{
  /* --section: Base Text -- */
}
export default function KchowInterface() {
  const [baseText, setBaseText] = useState("");

  useEffect(() => {
    fetch("/baseText.txt")
      .then((res) => res.text())
      .then((text) => setBaseText(text))
      .catch((err) => {
        console.error("Failed to load baseText:", err);
      });
  }, []);
  const defaultInterface = {
    name: "",
    ipv4: "",
    ipv6: "",
    mask: "/24",
    comment: "",
    vlan: "",
  };
  const defaultGateway = {
    hostname: "",
    ipv6Enabled: false,
    bonded: false,
    vlan: false,
    location: "",
    rackRow: "",
    interfaces: [defaultInterface],
    bondAssignments: { bond1: [], bond2: [] },
  };

  const [gateways, setGateways] = useState({
    fw1: JSON.parse(JSON.stringify(defaultGateway)),
    fw2: JSON.parse(JSON.stringify(defaultGateway)),
  });
  const [activeGateway, setActiveGateway] = useState("fw1");
  const [previewOpen, setPreviewOpen] = useState(false);
  const [canDownload, setCanDownload] = useState(false);
  const [previewText, setPreviewText] = useState({ fw1: "", fw2: "" });
  const [showBase, setShowBase] = useState(true);
  const [fieldErrors, setFieldErrors] = useState({ fw1: [], fw2: [] });
  const [downloadText, setDownloadText] = useState({ fw1: "", fw2: "" });


  const maskOptions = [
    "/24",
    "/25",
    "/26",
    "/27",
    "/28",
    "/29",
    "/30",
    "/31",
    "/32",
  ];
  const interfaceNames = [
    "eth1-01",
    "eth1-02",
    "eth1-03",
    "eth1-04",
    "eth2-01",
    "eth2-02",
    "eth2-03",
    "eth2-04",
  ];

  useEffect(() => {
    const interfaces = gateways[activeGateway]?.interfaces || [];
    setFieldErrors((prev) => ({
      ...prev,
      [activeGateway]: interfaces.map(() => ({
        name: false,
        ipv4: false,
        ipv6: false,
        mask: false,
        vlan: false,
      })),
    }));
  }, [gateways, activeGateway]);

  const updateGateway = (updates) => {
    setGateways((prev) => ({
      ...prev,
      [activeGateway]: { ...prev[activeGateway], ...updates },
    }));
  };

  const updateInterfaces = (updatedInterfaces) => {
    updateGateway({ interfaces: updatedInterfaces });
  };

  const handleAddInterface = () => {
    const interfaces = gateways[activeGateway].interfaces;
    updateInterfaces([...interfaces, { ...defaultInterface }]);
  };

  const handleRemoveInterface = (index) => {
    const interfaces = gateways[activeGateway].interfaces;
    updateInterfaces(interfaces.filter((_, i) => i !== index));
  };

  const handleAssignToBond = (bond, iface) => {
    updateGateway({
      bondAssignments: {
        ...gateways[activeGateway].bondAssignments,
        [bond]: [...gateways[activeGateway].bondAssignments[bond], iface],
      },
    });
  };

  const handleRemoveBondMember = (bond, iface) => {
    const updatedGroup = gateways[activeGateway].bondAssignments[bond].filter(
      (i) => i !== iface
    );
    updateGateway({
      bondAssignments: {
        ...gateways[activeGateway].bondAssignments,
        [bond]: updatedGroup,
      },
    });
  };

  const validateFields = (gateway) => {
    const missing = [];
    const errorFlags = gateway.interfaces.map((iface, i) => {
      const errors = {
        name: !iface.name,
        ipv4:
          !iface.ipv4 ||
          !/^(25[0-5]|2[0-4]\d|1\d{2}|[1-9]?\d)(\.(25[0-5]|2[0-4]\d|1\d{2}|[1-9]?\d)){3}$/.test(
            iface.ipv4
          ),
        ipv6: gateway.ipv6Enabled && !iface.ipv6,
        mask: !iface.mask,
        vlan: gateway.vlan && !iface.vlan,
      };
      Object.entries(errors).forEach(([key, val]) => {
        if (val) missing.push(`Interface ${i + 1}: ${key}`);
      });
      return errors;
    });
    if (!gateway.hostname.trim()) missing.push("Hostname");
    if (!gateway.location.trim()) missing.push("Location");
    if (!gateway.rackRow.trim()) missing.push("Rack/Row");

    return { missing, errorFlags };
  };

  const generateLines = (gateway) => {
    const lines = [];
    lines.push(`# Hostname: ${gateway.hostname}`);
    lines.push(`set snmp location "${gateway.location} RR ${gateway.rackRow}"`);

    if (gateway.bonded) {
      [1, 2].forEach((num) => {
        lines.push(`add bonding group ${num}`);
        lines.push(`set bonding group ${num} mode 8023AD`);
        lines.push(`set bonding group ${num} down-delay 200`);
        lines.push(`set bonding group ${num} lacp-rate slow`);
        lines.push(`set bonding group ${num} mii-interval 100`);
        lines.push(`set bonding group ${num} up-delay 100`);
        lines.push(`set bonding group ${num} xmit-hash-policy layer3+4`);
        const group =
          num === 1
            ? gateway.bondAssignments.bond1
            : gateway.bondAssignments.bond2;
        group.forEach((i) => {
          lines.push(`add bonding group ${num} interface ${i}`);
        });
      });
    }

    gateway.interfaces.forEach((iface) => {
      const base = iface.name;
      const label = gateway.vlan && iface.vlan ? `${base}.${iface.vlan}` : base;

      lines.push(`set interface ${label} state on`);

      const allBonded = [
        ...gateway.bondAssignments.bond1,
        ...gateway.bondAssignments.bond2,
      ];
      const isBondedPhysical = allBonded.includes(base);
      const isConfiguredBond =
        (base === "bond1" && gateway.bondAssignments.bond1.length > 0) ||
        (base === "bond2" && gateway.bondAssignments.bond2.length > 0);

      if (isBondedPhysical || (base.startsWith("bond") && !isConfiguredBond))
        return;

      if (gateway.vlan && iface.vlan) {
        lines.push(`add interface ${base} vlan ${iface.vlan}`);
      }

      lines.push(
        `set interface ${label} ipv4-address ${
          iface.ipv4
        } mask-length ${iface.mask.replace("/", "")}`
      );

      if (gateway.ipv6Enabled && iface.ipv6) {
        lines.push(
          `set interface ${label} ipv6-address ${iface.ipv6} mask-length 64`
        );
      }

      lines.push(`set interface ${label} comments "${iface.comment}"`);
      lines.push("#");
    });
    return lines;
  };

  const handleGenerateConfig = () => {
    const updatedDownloadText = {};
    const newPreview = {};
    let anyMissing = false;
    const combinedFieldErrors = {};
    const allMissing = [];

    Object.entries(gateways).forEach(([key, gw]) => {
      const { missing, errorFlags } = validateFields(gw);
      if (missing.length > 0) {
        anyMissing = true;
        combinedFieldErrors[key] = errorFlags;
        allMissing.push(`[${key.toUpperCase()}]`);
        allMissing.push(...missing);
      }
    });

    if (anyMissing) {
      setFieldErrors(combinedFieldErrors);
      alert("Missing required fields:\n" + allMissing.join("\n"));
      return;
    }

    Object.entries(gateways).forEach(([key, gw]) => {
      const lines = generateLines(gw);
      newPreview[key] = lines.join("\n");
      updatedDownloadText[key] = lines.join("\n") + "\n" + baseText;
    });

    setPreviewText(newPreview);
    setDownloadText(updatedDownloadText);
    setPreviewOpen(true);
    setCanDownload(true);
  };

  {
    /* --section: reset form -- */
  }
  const handleResetForm = () => {
    const reset = () => JSON.parse(JSON.stringify(defaultGateway));
    setGateways({
      fw1: reset(),
      fw2: reset(),
    });
    setPreviewOpen(false);
    setShowBase(true);
  };

  return (
    <div className="p-6" tabIndex={-1}>
      <img
        src={`${process.env.PUBLIC_URL}/images/gw_builder.png`}
        alt="KCHOW Logo"
        className="h-40 mx-auto mb-10"
      />
      <div className="text-center text-sm text-gray-500 mb-6">v4.5</div>
      <div className="grid md:grid-cols-2 gap-6 border-t border-gray-300 pt-6">
        {" "}
        {/* div#3 start */}
        {["fw1", "fw2"].map((key) => (
          <Card key={key} className="border-2 border-dashed border-gray-400">
            <CardContent className="space-y-4 pt-6">
              <h2 className="text-lg font-semibold text-center">
                {gateways[key].hostname.trim() ||
                  (key === "fw1" ? "Gateway A" : "Gateway B")}
              </h2>

              {/* --section: hostname -- */}
              <div>
                <label className="font-semibold">Hostname:</label>
                <Input
                  placeholder="e.g. enter hostname"
                  value={gateways[key].hostname}
                  onChange={(e) =>
                    setGateways((prev) => ({
                      ...prev,
                      [key]: {
                        ...prev[key],
                        hostname: e.target.value.toUpperCase(),
                      },
                    }))
                  }
                />
              </div>

              {/* --section: location -- */}
              <div>
                <label className="font-semibold">Location:</label>
                <Input
                  placeholder="e.g. DC/MSO Name"
                  value={gateways[key].location}
                  onChange={(e) =>
                    setGateways((prev) => ({
                      ...prev,
                      [key]: {
                        ...prev[key],
                        location: e.target.value.toUpperCase(),
                      },
                    }))
                  }
                />
              </div>

              {/* --section: rack/row -- */}
              <div>
                <label className="font-semibold">Rack/Row:</label>
                <Input
                  placeholder="e.g. 0000.000.00"
                  value={gateways[key].rackRow}
                  onChange={(e) =>
                    setGateways((prev) => ({
                      ...prev,
                      [key]: { ...prev[key], rackRow: e.target.value },
                    }))
                  }
                />
              </div>

              {/* --section: checkboxes -- */}
              <div className="flex gap-4">
                <label className="flex items-center gap-2">
                  <Checkbox
                    checked={gateways[key].ipv6Enabled}
                    onCheckedChange={(val) =>
                      setGateways((prev) => ({
                        ...prev,
                        [key]: { ...prev[key], ipv6Enabled: val },
                      }))
                    }
                  />
                  IPv6
                </label>

                <label className="flex items-center gap-2">
                  <Checkbox
                    checked={gateways[key].bonded}
                    onCheckedChange={(val) =>
                      setGateways((prev) => ({
                        ...prev,
                        [key]: { ...prev[key], bonded: val },
                      }))
                    }
                  />
                  Bonded
                </label>

                <label className="flex items-center gap-2">
                  <Checkbox
                    checked={gateways[key].vlan}
                    onCheckedChange={(val) =>
                      setGateways((prev) => ({
                        ...prev,
                        [key]: { ...prev[key], vlan: val },
                      }))
                    }
                  />
                  VLAN
                </label>
              </div>

              {/* --section: interface selection for bonds -- */}
              {gateways[key].bonded && (
                <div className="mt-4 space-y-2">
                  {["bond1", "bond2"].map((bond) => (
                    <div key={bond}>
                      <label className="font-semibold">
                        Assign interfaces to {bond}:
                      </label>
                      <select
                        className="border rounded px-2 py-1"
                        value=""
                        onChange={(e) => {
                          const iface = e.target.value;
                          if (!iface) return;
                          setGateways((prev) => ({
                            ...prev,
                            [key]: {
                              ...prev[key],
                              bondAssignments: {
                                ...prev[key].bondAssignments,
                                [bond]: [
                                  ...prev[key].bondAssignments[bond],
                                  iface,
                                ],
                              },
                            },
                          }));
                        }}
                      >
                        <option value="">Select Interface</option>
                        {interfaceNames
                          .filter(
                            (name) =>
                              !gateways[key].bondAssignments.bond1.includes(
                                name
                              ) &&
                              !gateways[key].bondAssignments.bond2.includes(
                                name
                              )
                          )
                          .map((name) => (
                            <option key={name} value={name}>
                              {name}
                            </option>
                          ))}
                      </select>

                      <div className="flex flex-wrap gap-2 mt-2">
                        {gateways[key].bondAssignments[bond].map((iface) => (
                          <span
                            key={iface}
                            className="bg-gray-200 px-2 py-1 rounded text-sm"
                          >
                            {iface}
                            <button
                              className="ml-2 text-red-600"
                              onClick={() =>
                                setGateways((prev) => ({
                                  ...prev,
                                  [key]: {
                                    ...prev[key],
                                    bondAssignments: {
                                      ...prev[key].bondAssignments,
                                      [bond]: prev[key].bondAssignments[
                                        bond
                                      ].filter((i) => i !== iface),
                                    },
                                  },
                                }))
                              }
                            >
                              &times;
                            </button>
                          </span>
                        ))}
                      </div>
                    </div>
                  ))}
                </div>
              )}

              {/* --section: interface selection (no bond) -- */}
              {gateways[key].interfaces.map((iface, i) => (
                <div
                  key={i}
                  className="grid grid-cols-1 md:grid-cols-2 gap-2 border-t pt-4 mt-4"
                >
                  <div>
                    <label>Interface Name</label>
                    <select
                      className="border rounded px-2 py-1"
                      value={iface.name}
                      onChange={(e) => {
                        const updated = [...gateways[key].interfaces];
                        updated[i].name = e.target.value;
                        setGateways((prev) => ({
                          ...prev,
                          [key]: { ...prev[key], interfaces: updated },
                        }));
                      }}
                    >
                      <option value="">-- Select Interface --</option>
                      {[
                        ...(gateways[key].bonded ? ["bond1", "bond2"] : []),
                        ...interfaceNames,
                      ].map((name) => (
                        <option key={name} value={name}>
                          {name}
                        </option>
                      ))}
                    </select>
                  </div>

                  {/* --section: IP address -- */}
                  <div>
                    <label>IPv4</label>
                    <Input
                      value={iface.ipv4}
                      onChange={(e) => {
                        const updated = [...gateways[key].interfaces];
                        updated[i].ipv4 = e.target.value;
                        setGateways((prev) => ({
                          ...prev,
                          [key]: { ...prev[key], interfaces: updated },
                        }));
                      }}
                    />
                  </div>

                  {/* --section: Mask Length -- */}
                  <div>
                    <label>Mask Length</label>
                    <select
                      className="border rounded px-2 py-1"
                      value={iface.mask}
                      onChange={(e) => {
                        const updated = [...gateways[key].interfaces];
                        updated[i].mask = e.target.value;
                        setGateways((prev) => ({
                          ...prev,
                          [key]: { ...prev[key], interfaces: updated },
                        }));
                      }}
                    >
                      {maskOptions.map((opt) => (
                        <option key={opt} value={opt}>
                          {opt}
                        </option>
                      ))}
                    </select>
                  </div>

                  {gateways[key].ipv6Enabled && (
                    <div>
                      <label>IPv6</label>
                      <Input
                        value={iface.ipv6}
                        onChange={(e) => {
                          const updated = [...gateways[key].interfaces];
                          updated[i].ipv6 = e.target.value;
                          setGateways((prev) => ({
                            ...prev,
                            [key]: { ...prev[key], interfaces: updated },
                          }));
                        }}
                      />
                    </div>
                  )}

                  {/* --section: VLAN -- */}
                  {gateways[key].vlan && (
                    <div>
                      <label>VLAN</label>
                      <Input
                        placeholder="e.g. vlan #"
                        value={iface.vlan}
                        onChange={(e) => {
                          const updated = [...gateways[key].interfaces];
                          updated[i].vlan = e.target.value;
                          setGateways((prev) => ({
                            ...prev,
                            [key]: { ...prev[key], interfaces: updated },
                          }));
                        }}
                      />
                    </div>
                  )}

                  {/* --section: Comments -- */}
                  <div>
                    <label>Comment</label>
                    <Input
                      placeholder="e.g. Description"
                      value={iface.comment}
                      onChange={(e) => {
                        const updated = [...gateways[key].interfaces];
                        updated[i].comment = e.target.value;
                        setGateways((prev) => ({
                          ...prev,
                          [key]: { ...prev[key], interfaces: updated },
                        }));
                      }}
                    />
                  </div>

                  <div className="pt-4">
                    <Button
                      variant="outline"
                      onClick={() => {
                        const updated = [
                          ...gateways[key].interfaces,
                          { ...defaultInterface },
                        ];
                        setGateways((prev) => ({
                          ...prev,
                          [key]: { ...prev[key], interfaces: updated },
                        }));
                      }}
                    >
                      + Add Interface
                    </Button>
                  </div>
                </div>
              ))}
            </CardContent>
          </Card>
        ))}
        {/* div#3 end */}
      </div>

      <div className="mt-6 flex gap-4">
        <Button
          className="bg-blue-600 text-white hover:bg-blue-700"
          onClick={handleGenerateConfig}
        >
          Verify Config
        </Button>

        <Button
          className="border border-blue-600 text-blue-600 hover:bg-blue-50"
          onClick={handleResetForm}
        >
          Reset Form
        </Button>

        {previewOpen && (
          <>
            <div className="fixed inset-0 bg-black bg-opacity-40 flex items-center justify-center z-50">
              {" "}
              {/* overlay */}
              <div className="relative bg-white p-6 rounded-lg shadow-lg w-full max-w-5xl max-h-[90vh] overflow-auto resize">
                {" "}
                {/* wrapper */}
                <h2 className="text-lg font-semibold mb-4">
                  Configuration Preview
                  <div className="absolute top-4 right-4">
                    <button
                      className="text-gray-600 hover:text-red-600 text-xl font-bold"
                      onClick={() => setPreviewOpen(false)}
                      aria-label="Close Preview"
                    >
                      &times;
                    </button>
                  </div>
                </h2>
                <div className="bg-gray-100 p-4 rounded overflow-x-auto max-h-96 whitespace-pre-wrap text-sm">
                  {" "}
                  {/* modal */}
                  <Button
                    variant="ghost"
                    className="mb-2 text-blue-600 hover:underline"
                    onClick={() => setShowBase((prev) => !prev)}
                  >
                    {showBase ? "Hide Base Config" : "Show Base Config"}
                  </Button>
                  {showBase && (
                    <div className="mb-6">
                      <h3 className="font-semibold text-sm mb-1">
                        Base Config
                      </h3>
                      <pre>{baseText}</pre>
                    </div>
                  )}
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                    {" "}
                    {/* colors */}
                    {Object.entries(previewText).map(([key, text]) => (
                      <div key={key}>
                        <h3>
                          {gateways[key].hostname.trim() ||
                            (key === "fw1" ? "Gateway A" : "Gateway B")}
                        </h3>
                        <pre>{text.replace(baseText + "\n", "")}</pre>
                        {/* colors */}
                      </div>
                    ))}
                    {/* ??? */}
                  </div>
                  {/* ??? */}
                </div>
                <div className="mt-4 flex flex-wrap justify-end gap-4">
                  {" "}
                  {/* flex-wrap */}
                  <Button
                    onClick={() => {
                      const text = downloadText.fw1;
                      const blob = new Blob([text], { type: "text/plain" });
                      const url = URL.createObjectURL(blob);
                      const link = document.createElement("a");
                      link.href = url;
                      link.download = `${
                        gateways.fw1.hostname?.trim() || "fw1"
                      }-config.txt`;
                      document.body.appendChild(link);
                      link.click();
                      document.body.removeChild(link);
                      URL.revokeObjectURL(url);
                    }}
                  >
                    Download {gateways.fw1.hostname.trim() || "Gateway A"}
                  </Button>
                  <Button
                    onClick={() => {
                      const text = downloadText.fw2;
                      const blob = new Blob([text], { type: "text/plain" });
                      const url = URL.createObjectURL(blob);
                      const link = document.createElement("a");
                      link.href = url;
                      link.download = `${
                        gateways.fw2.hostname?.trim() || "fw2"
                      }-config.txt`;
                      document.body.appendChild(link);
                      link.click();
                      document.body.removeChild(link);
                      URL.revokeObjectURL(url);
                    }}
                  >
                    Download {gateways.fw2.hostname.trim() || "Gateway B"}
                  </Button>
                </div>{" "}
                {/* modal */}
              </div>{" "}
              {/* wrapper */}
            </div>{" "}
            {/* overlay */}
          </>
        )}
      </div>
    </div>
  );
}
